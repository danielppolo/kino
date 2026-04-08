"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { useQuery } from "@tanstack/react-query";

import { useChartControls } from "@/components/charts/shared/chart-controls-context";
import { useForecastQuery } from "@/components/charts/shared/use-forecast-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { calculateTrimmedMean, formatCurrency } from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyStats } from "@/utils/supabase/queries";

interface FireStressTestChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const STRESS_YEARS = 20;
const INFLATION_SHOCK_YEARS = 3;
const DRAWDOWN_SHOCK_PCT = 0.35;
const SHOCK_MONTH = 12; // shocks branch off at year 1

const chartConfig: ChartConfig = {
  baseline: { label: "Baseline", color: "#3b82f6" },
  inflation: { label: "Inflation Shock", color: "#f59e0b" },
  drawdown: { label: "35% Drawdown", color: "#ef4444" },
  fx: { label: "FX Shock", color: "#8b5cf6" },
};

export function FireStressTestChart({
  walletId,
  from,
  to,
}: FireStressTestChartProps) {
  const { totalBalance } = useTotalBalance();
  const { conversionRates, baseCurrency } = useCurrency();
  const [wallets, walletMap] = useWallets();
  const controls = useChartControls();
  const effectiveMonthlySpend = controls?.effectiveMonthlySpend ?? 0;
  const selectedWR = controls?.selectedWR ?? 0.035;
  const assumedRealReturn = controls?.assumedRealReturn ?? 0.04;
  const fxExposurePct = controls?.fxExposurePct ?? 0.5;
  const horizonMonths = (controls?.forecastHorizonYears ?? 1) * 12;

  const workspaceWalletIds = useMemo(() => wallets.map((w) => w.id), [wallets]);

  const { data: monthlyStats, isLoading: loadingStats } = useQuery({
    queryKey: ["fire-stress-stats", walletId, from, to, baseCurrency],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyStats(supabase, {
        walletId,
        from,
        to,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: forecastData, isLoading: loadingForecast } = useForecastQuery({
    walletId,
    walletIds: workspaceWalletIds,
    horizonMonths,
    baseCurrency,
    conversionRates,
  });

  const isLoading = loadingStats || loadingForecast;

  const { netMonthlySavings } = useMemo(() => {
    if (!monthlyStats || monthlyStats.length === 0) {
      return { netMonthlySavings: 0 };
    }

    const incomeByMonth: Record<string, number> = {};
    const expenseByMonth: Record<string, number> = {};

    monthlyStats.forEach((stat) => {
      if (!incomeByMonth[stat.month]) incomeByMonth[stat.month] = 0;
      if (!expenseByMonth[stat.month]) expenseByMonth[stat.month] = 0;

      const wallet = walletMap.get(stat.wallet_id ?? "");
      const currency = wallet?.currency ?? baseCurrency;

      incomeByMonth[stat.month] +=
        convertCurrency(
          stat.income_cents,
          currency,
          baseCurrency,
          conversionRates,
        ) / 100;
      expenseByMonth[stat.month] +=
        Math.abs(
          convertCurrency(
            stat.outcome_cents,
            currency,
            baseCurrency,
            conversionRates,
          ),
        ) / 100;
    });

    const avgIncome = calculateTrimmedMean(
      Object.values(incomeByMonth).filter((v) => v > 0),
    );
    const avgExpense = calculateTrimmedMean(
      Object.values(expenseByMonth).filter((v) => v > 0),
    );

    return { netMonthlySavings: avgIncome - avgExpense };
  }, [monthlyStats, walletMap, baseCurrency, conversionRates]);

  const { chartData, fireNumber, horizonYears, forecastMethod } = useMemo(() => {
    const currentBalance = totalBalance / 100;
    const annualSpend = effectiveMonthlySpend * 12;
    const fn =
      selectedWR > 0 && annualSpend > 0 ? annualSpend / selectedWR : 0;
    const r = assumedRealReturn / 12;
    const totalMonths = STRESS_YEARS * 12;

    // ── ARIMA-informed monthly baseline ──────────────────────────────────────
    const forecastPoints = forecastData?.forecast ?? [];
    const lastForecastValue =
      forecastPoints.length > 0
        ? forecastPoints[forecastPoints.length - 1].value
        : currentBalance;
    const forecastImpliedDelta =
      forecastPoints.length > 0
        ? (lastForecastValue - currentBalance) / forecastPoints.length
        : netMonthlySavings;

    const monthlyBaseline: number[] = [];
    for (let m = 0; m <= totalMonths; m++) {
      if (m < forecastPoints.length) {
        // Use ARIMA value directly — already anchored to current balance
        monthlyBaseline.push(forecastPoints[m].value);
      } else {
        // Compound from last forecast value using ARIMA-implied delta
        const prev = monthlyBaseline[m - 1] ?? lastForecastValue;
        monthlyBaseline.push(Math.max(0, prev * (1 + r) + forecastImpliedDelta));
      }
    }

    // ── Sample yearly for baseline ────────────────────────────────────────────
    const baselineYearly = monthlyBaseline.filter((_, i) => i % 12 === 0);

    // ── Stress scenarios branching from SHOCK_MONTH ───────────────────────────
    const shockStartBalance = monthlyBaseline[SHOCK_MONTH] ?? currentBalance;
    const inflationShockMonths = INFLATION_SHOCK_YEARS * 12;

    // Pre-shock segment (years 0–1) sampled from monthlyBaseline for all scenarios
    const preShockYearly = baselineYearly.slice(
      0,
      Math.floor(SHOCK_MONTH / 12) + 1,
    );

    // Inflation shock: spending +8%, real return −2% for INFLATION_SHOCK_YEARS
    const inflationYearly: number[] = [...preShockYearly];
    {
      let balance = shockStartBalance;
      for (let m = SHOCK_MONTH; m <= totalMonths; m++) {
        if (m > SHOCK_MONTH && (m - SHOCK_MONTH) % 12 === 0) {
          inflationYearly.push(Math.max(0, balance));
        }
        const monthsIntoShock = m - SHOCK_MONTH;
        const isShock = monthsIntoShock < inflationShockMonths;
        const monthlyR = isShock ? (assumedRealReturn - 0.02) / 12 : r;
        const monthlyNet = isShock
          ? netMonthlySavings - effectiveMonthlySpend * (0.08 / 12)
          : netMonthlySavings;
        balance = balance * (1 + monthlyR) + monthlyNet;
      }
    }

    // Drawdown: 35% portfolio drop at SHOCK_MONTH, then resume baseline delta
    const drawdownYearly: number[] = [...preShockYearly];
    {
      let balance = shockStartBalance * (1 - DRAWDOWN_SHOCK_PCT);
      for (let m = SHOCK_MONTH; m <= totalMonths; m++) {
        if (m > SHOCK_MONTH && (m - SHOCK_MONTH) % 12 === 0) {
          drawdownYearly.push(Math.max(0, balance));
        }
        balance = balance * (1 + r) + netMonthlySavings;
      }
    }

    // FX shock: FX-exposed assets drop 20% at SHOCK_MONTH, then resume
    const fxYearly: number[] = [...preShockYearly];
    {
      let balance = shockStartBalance * (1 - fxExposurePct * 0.2);
      for (let m = SHOCK_MONTH; m <= totalMonths; m++) {
        if (m > SHOCK_MONTH && (m - SHOCK_MONTH) % 12 === 0) {
          fxYearly.push(Math.max(0, balance));
        }
        balance = balance * (1 + r) + netMonthlySavings;
      }
    }

    // ── CI band data ──────────────────────────────────────────────────────────
    // forecastPoints is monthly; sample at each yearly boundary within horizon
    const hYears = Math.round(horizonMonths / 12);
    const ciByYear: Record<number, { lower: number; upper: number }> = {};
    for (let y = 1; y <= hYears; y++) {
      const idx = y * 12 - 1; // last month of the year
      const fp = forecastPoints[idx];
      if (fp) {
        ciByYear[y] = { lower: fp.lower, upper: fp.upper };
      }
    }

    // ── Build flat yearly data array ──────────────────────────────────────────
    const data = baselineYearly.map((baselineVal, i) => ({
      year: i,
      baseline: baselineVal,
      inflation: inflationYearly[i] ?? 0,
      drawdown: drawdownYearly[i] ?? 0,
      fx: fxYearly[i] ?? 0,
      ciLower: ciByYear[i]?.lower ?? null,
      ciUpper: ciByYear[i]?.upper ?? null,
    }));

    return {
      chartData: data,
      fireNumber: fn,
      horizonYears: hYears,
      forecastMethod: forecastData?.metadata?.method ?? "ARIMA",
    };
  }, [
    totalBalance,
    effectiveMonthlySpend,
    selectedWR,
    assumedRealReturn,
    netMonthlySavings,
    fxExposurePct,
    forecastData,
    horizonMonths,
  ]);

  const yAxisFormatter = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toFixed(0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stress Test Scenarios</CardTitle>
          <CardDescription>
            Portfolio trajectories under Mexico-specific risk scenarios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stress Test Scenarios</CardTitle>
        <CardDescription>
          {STRESS_YEARS}-year portfolio trajectories under four scenarios.
          Baseline uses {forecastMethod} forecast for the first{" "}
          {horizonMonths / 12} year(s), then compound-interest projection. Shocks
          applied at year 1: inflation (+8% spending, −2% return for 3 years),{" "}
          {(DRAWDOWN_SHOCK_PCT * 100).toFixed(0)}% drawdown, and FX shock (
          {(fxExposurePct * 20).toFixed(0)}% portfolio loss on{" "}
          {(fxExposurePct * 100).toFixed(0)}% USD exposure).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
          <LineChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 4 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `${v}y`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={yAxisFormatter}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">
                      Year {label}
                    </div>
                    {payload.map((p) => (
                      <div
                        key={String(p.dataKey)}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          <span>{p.name}</span>
                        </div>
                        <span className="tabular-nums font-medium">
                          {formatCurrency(Number(p.value), baseCurrency)}
                        </span>
                      </div>
                    ))}
                    {fireNumber > 0 && (
                      <div className="text-muted-foreground mt-1 border-t pt-1 text-xs">
                        FIRE: {formatCurrency(fireNumber, baseCurrency)}
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* ARIMA CI band — shaded region on the baseline for the forecast horizon */}
            {chartData
              .filter(
                (p) => p.ciLower != null && p.ciUpper != null && p.year > 0,
              )
              .map((p) => (
                <ReferenceArea
                  key={p.year}
                  x1={p.year - 1}
                  x2={p.year}
                  y1={p.ciLower!}
                  y2={p.ciUpper!}
                  fill="#3b82f6"
                  fillOpacity={0.06}
                  stroke="none"
                />
              ))}

            {/* Horizon boundary line — where ARIMA ends and compound tail begins */}
            {horizonYears > 0 && (
              <ReferenceLine
                x={horizonYears}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{
                  value: "ARIMA→",
                  position: "top",
                  fontSize: 9,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
            )}

            {fireNumber > 0 && (
              <ReferenceLine
                y={fireNumber}
                stroke="#22c55e"
                strokeDasharray="4 4"
                label={{
                  value: "FIRE target",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#22c55e",
                }}
              />
            )}
            <Line
              dataKey="baseline"
              name="Baseline"
              type="monotone"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="inflation"
              name="Inflation Shock"
              type="monotone"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              dataKey="drawdown"
              name="35% Drawdown"
              type="monotone"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              dataKey="fx"
              name="FX Shock"
              type="monotone"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="text-muted-foreground text-xs">
          Scenarios are illustrative. Adjust FX exposure % in FIRE controls.
          All shocks assume recovery to baseline conditions after the shock
          period. Shaded band shows ARIMA 95% confidence interval.
        </div>
      </CardFooter>
    </Card>
  );
}
