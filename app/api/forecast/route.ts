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

    const rawBalanceSeries = sortedMonths
      .map((m) => balanceByMonth[m])
      .slice(-TRAINING_WINDOW);

    // Align net series to the same window for shock/recovery detection
    const rawNetSeries = sortedMonths
      .map((m) => netByMonth[m] ?? 0)
      .slice(-TRAINING_WINDOW);

    // Detect economic shock followed by recovery → train only on post-shock segment
    const recoveryIdx = findRecoveryStartIndex(rawNetSeries, rawBalanceSeries);
    const recoveryDetected = recoveryIdx > 0;
    const trainingSeries = recoveryDetected
      ? rawBalanceSeries.slice(recoveryIdx)
      : rawBalanceSeries;

    // Winsorize remaining one-time outliers
    const cleanedSeries = winsorize(trainingSeries);

    // Normalize for ARIMA numerical stability (large absolute values can cause issues)
    const scale = Math.max(1, ...cleanedSeries.map(Math.abs));
    const normalizedSeries = cleanedSeries.map((v) => v / scale);

    // Run Auto-ARIMA; use seasonal variant if we have ≥ 24 months
    const useSeasonal = cleanedSeries.length >= 24;
    let predictions: number[];
    let errors: number[];
    let method: string;

    try {
      const arima = new ARIMA({
        auto: true,
        s: useSeasonal ? 12 : 0,
        verbose: false,
      });
      arima.train(normalizedSeries);
      const result = arima.predict(horizon) as [number[], number[]];
      predictions = result[0].map((v) => v * scale);
      errors = result[1].map((v) => Math.abs(v) * scale);
      method = useSeasonal ? "auto-SARIMA[12]" : "auto-ARIMA";
    } catch {
      // Fallback: project last observed slope
      const n = cleanedSeries.length;
      const last = cleanedSeries[n - 1];
      const slope = n > 1 ? last - cleanedSeries[n - 2] : 0;
      predictions = Array.from(
        { length: horizon },
        (_, i) => last + slope * (i + 1),
      );
      errors = Array(horizon).fill(Math.abs(last) * 0.1);
      method = "linear-fallback";
    }

    // Build output months by advancing from the last known balance month
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    const [ly, lm] = lastMonth.split("-").map(Number);

    const forecast: ForecastPoint[] = predictions.map((value, i) => {
      const d = new Date(ly, lm - 1 + i + 1, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const err = errors[i] ?? 0;
      return {
        month,
        value,
        lower: value - Z_95 * err,
        upper: value + Z_95 * err,
      };
    });

    return {
      forecast,
      avgMonthlyBurn,
      metadata: {
        trainingMonths: cleanedSeries.length,
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
