import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { createServiceRoleClient } from "@/utils/supabase/server";
import {
  calculateTrimmedMean,
  findRecoveryStartIndex,
  winsorize,
} from "@/utils/chart-helpers";

// arima uses WASM — loaded natively by Node.js, listed in serverExternalPackages
// so webpack doesn't try to bundle the binary.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ARIMA = require("arima");

const TRAINING_WINDOW = 36; // months
const Z_95 = 1.96;

export interface ForecastPoint {
  month: string;
  value: number;
  lower: number;
  upper: number;
}

export interface ForecastApiResponse {
  forecast: ForecastPoint[];
  /** Average monthly burn rate in base currency (dollars, not cents) */
  avgMonthlyBurn: number;
  metadata: {
    trainingMonths: number;
    /** e.g. "auto-SARIMA[12]" | "auto-ARIMA" | "linear-fallback" */
    method: string;
    recoveryDetected: boolean;
  };
}

// ---------------------------------------------------------------------------
// Core computation — wrapped by unstable_cache below.
// All arguments are included in the cache key by Next.js.
// ---------------------------------------------------------------------------
const _computeForecast = unstable_cache(
  async (
    walletId: string | null,
    walletIds: string[],
    horizon: number,
    baseCurrency: string,
    conversionRates: Record<string, { rate: number }>,
  ): Promise<ForecastApiResponse> => {
    const supabase = createServiceRoleClient();

    // Fetch wallet → currency mapping
    const walletsQuery = walletId
      ? supabase.from("wallets").select("id, currency").eq("id", walletId)
      : supabase.from("wallets").select("id, currency").in("id", walletIds);

    const { data: wallets } = await walletsQuery;
    const walletCurrencyMap = new Map(
      (wallets ?? []).map((w) => [w.id, w.currency as string]),
    );

    // Fetch ALL history (no date filter — training needs max context)
    const balancesQuery =
      walletId != null
        ? supabase
            .from("wallet_monthly_balances")
            .select("wallet_id, month, balance_cents")
            .eq("wallet_id", walletId)
            .order("month", { ascending: true })
        : supabase
            .from("wallet_monthly_balances")
            .select("wallet_id, month, balance_cents")
            .in("wallet_id", walletIds)
            .order("month", { ascending: true });

    const statsQuery =
      walletId != null
        ? supabase
            .from("monthly_stats")
            .select("wallet_id, month, outcome_cents, net_cents")
            .eq("wallet_id", walletId)
            .order("month", { ascending: true })
        : supabase
            .from("monthly_stats")
            .select("wallet_id, month, outcome_cents, net_cents")
            .in("wallet_id", walletIds)
            .order("month", { ascending: true });

    const [{ data: balances }, { data: stats }] = await Promise.all([
      balancesQuery,
      statsQuery,
    ]);

    // Aggregate total balance per month in base currency
    const balanceByMonth: Record<string, number> = {};
    (balances ?? []).forEach((b) => {
      const currency = walletCurrencyMap.get(b.wallet_id) ?? baseCurrency;
      const rate = conversionRates[currency]?.rate ?? 1;
      balanceByMonth[b.month] =
        (balanceByMonth[b.month] ?? 0) + (b.balance_cents * rate) / 100;
    });

    // Aggregate net change and expenses per month in base currency
    const netByMonth: Record<string, number> = {};
    const expenseByMonth: Record<string, number> = {};
    (stats ?? []).forEach((s) => {
      if (!s.wallet_id) return;
      const currency = walletCurrencyMap.get(s.wallet_id) ?? baseCurrency;
      const rate = conversionRates[currency]?.rate ?? 1;
      netByMonth[s.month] =
        (netByMonth[s.month] ?? 0) + (s.net_cents * rate) / 100;
      expenseByMonth[s.month] =
        (expenseByMonth[s.month] ?? 0) +
        Math.abs((s.outcome_cents * rate) / 100);
    });

    const avgMonthlyBurn = calculateTrimmedMean(
      Object.values(expenseByMonth).filter((v) => v > 0),
    );

    const sortedMonths = Object.keys(balanceByMonth).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    if (sortedMonths.length < 4) {
      return {
        forecast: [],
        avgMonthlyBurn,
        metadata: {
          trainingMonths: sortedMonths.length,
          method: "insufficient-data",
          recoveryDetected: false,
        },
      };
    }

    // Detect if the last balance record belongs to the current (still-open) month.
    // wallet_monthly_balances is updated in real-time by triggers, so the current month
    // has a partial balance (only days elapsed so far).  Its delta vs. the previous month
    // would be artificially small (incomplete month), which skews ARIMA training.
    // We keep it as the projection anchor but exclude it from the delta training series.
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastSortedMonth = sortedMonths[sortedMonths.length - 1];
    const isPartialMonth = lastSortedMonth === currentMonthKey;

    // The anchor is the latest known balance (partial month is fine as a starting point).
    const currentBalance = balanceByMonth[lastSortedMonth];

    // Training uses only complete months so deltas represent full monthly cash flows.
    const completeMonths = isPartialMonth ? sortedMonths.slice(0, -1) : sortedMonths;

    const rawBalanceSeries = completeMonths
      .map((m) => balanceByMonth[m])
      .slice(-TRAINING_WINDOW);

    // Align net series to the same window for shock/recovery detection
    const rawNetSeries = completeMonths
      .map((m) => netByMonth[m] ?? 0)
      .slice(-TRAINING_WINDOW);

    // Detect economic shock followed by recovery → train only on post-shock segment
    const recoveryIdx = findRecoveryStartIndex(rawNetSeries, rawBalanceSeries);
    const recoveryDetected = recoveryIdx > 0;
    const trainingSeries = recoveryDetected
      ? rawBalanceSeries.slice(recoveryIdx)
      : rawBalanceSeries;

    // Train on the monthly-delta series rather than absolute balances.
    // Absolute-value ARIMA predicts mean-reversion toward the historical average,
    // causing a flat forecast when the current balance differs from that average.
    // Delta-based ARIMA captures cash-flow patterns (income/expense cycles) and
    // projects them forward from the ACTUAL current balance — no mean-reversion artefact.
    const rawDeltas = trainingSeries.slice(1).map((v, i) => v - trainingSeries[i]);

    // Need at least 3 deltas to fit a model
    if (rawDeltas.length < 3) {
      return {
        forecast: [],
        avgMonthlyBurn,
        metadata: {
          trainingMonths: trainingSeries.length,
          method: "insufficient-data",
          recoveryDetected,
        },
      };
    }

    // Winsorize deltas to suppress one-off large transfers
    const cleanedDeltas = winsorize(rawDeltas);

    // Normalize for ARIMA numerical stability
    const scale = Math.max(1, ...cleanedDeltas.map(Math.abs));
    const normalizedDeltas = cleanedDeltas.map((d) => d / scale);

    // Run Auto-ARIMA on the delta series; use seasonal variant if we have ≥ 24 deltas
    const useSeasonal = cleanedDeltas.length >= 24;
    let predictedDeltas: number[];
    let errors: number[];
    let method: string;

    try {
      const arima = new ARIMA({
        auto: true,
        s: useSeasonal ? 12 : 0,
        verbose: false,
      });
      arima.train(normalizedDeltas);
      const result = arima.predict(horizon) as [number[], number[]];
      predictedDeltas = result[0].map((v) => v * scale);
      errors = result[1].map((v) => Math.abs(v) * scale);
      method = useSeasonal ? "auto-SARIMA[12]-delta" : "auto-ARIMA-delta";
    } catch {
      // Fallback: repeat the trimmed-mean delta (linear extrapolation)
      const avgDelta = calculateTrimmedMean(rawDeltas);
      predictedDeltas = Array(horizon).fill(avgDelta);
      errors = Array(horizon).fill(Math.abs(avgDelta) * 0.5 + Math.abs(currentBalance) * 0.02);
      method = "linear-fallback";
    }

    // Apply predicted deltas cumulatively from the actual current balance
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    const [ly, lm] = lastMonth.split("-").map(Number);

    let running = currentBalance;
    const forecast: ForecastPoint[] = predictedDeltas.map((delta, i) => {
      running += delta;
      const d = new Date(ly, lm - 1 + i + 1, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      // Accumulate errors (uncertainty grows over time)
      const cumulativeErr = errors.slice(0, i + 1).reduce((s, e) => s + e, 0);
      return {
        month,
        value: running,
        lower: running - Z_95 * cumulativeErr,
        upper: running + Z_95 * cumulativeErr,
      };
    });

    return {
      forecast,
      avgMonthlyBurn,
      metadata: {
        trainingMonths: cleanedDeltas.length,
        method,
        recoveryDetected,
      },
    };
  },
  ["api-forecast"],
  { revalidate: 3600 }, // cache per unique arg combination, refresh hourly
);

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletId = null,
      walletIds = [],
      horizon = 12,
      baseCurrency,
      conversionRates,
    } = body as {
      walletId?: string | null;
      walletIds?: string[];
      horizon?: number;
      baseCurrency: string;
      conversionRates: Record<string, { rate: number }>;
    };

    if (!baseCurrency || !conversionRates) {
      return NextResponse.json(
        { error: "Missing baseCurrency or conversionRates" },
        { status: 400 },
      );
    }

    const clampedHorizon = Math.min(Math.max(1, horizon), 48);

    const result = await _computeForecast(
      walletId,
      walletIds,
      clampedHorizon,
      baseCurrency,
      conversionRates,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/forecast] error:", error);
    return NextResponse.json(
      { error: "Failed to compute forecast" },
      { status: 500 },
    );
  }
}
