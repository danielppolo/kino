"use client";

import { useMemo } from "react";
import { addMonths, format } from "date-fns";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { useQuery } from "@tanstack/react-query";

import { Money } from "../ui/money";

import { ChartSkeleton } from "@/components/charts/shared/chart-skeleton";
import { useChartControls } from "@/components/charts/shared/chart-controls-context";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  capChartOutliers,
  formatCurrency,
  parseMonthDate,
} from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import {
  getMonthlyStats,
  listRecurringTransactions,
} from "@/utils/supabase/queries";

interface BurnRateDriftChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const chartConfig: ChartConfig = {
  expense: {
    label: "Monthly Spend",
    color: "#ef4444",
  },
  rolling: {
    label: "3-Month Avg",
    color: "#f59e0b",
  },
};

export function BurnRateDriftChart({
  walletId,
  from,
  to,
}: BurnRateDriftChartProps) {
  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();
  const controls = useChartControls();
  const normalizationPercentile = controls?.peakNormalizationPercentile ?? 0.9;
  const horizonYears = controls?.forecastHorizonYears ?? 1;
  const horizonMonths = horizonYears * 12;
  const effectiveMonthlySpend = controls?.effectiveMonthlySpend ?? 0;

  const { data: monthlyStats, isLoading: loadingStats } = useQuery({
    queryKey: ["burn-rate-drift-stats", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyStats(supabase, {
        walletId,
        from,
        to,
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: recurringTransactions, isLoading: loadingRecurring } = useQuery(
    {
      queryKey: ["burn-rate-drift-recurring", walletId],
      queryFn: async () => {
        const supabase = await createClient();
        const { data, error } = await listRecurringTransactions(supabase, {
          walletId,
          type: "expense",
        });
        if (error) throw error;
        return data ?? [];
      },
    },
  );

  const isLoading = loadingStats || loadingRecurring;

  const {
    chartData,
    drift,
    fixedBaseline,
    cappedFixedBaseline,
    lastHistoricalMonth,
  } = useMemo(() => {
    if (!monthlyStats || monthlyStats.length === 0) {
      return {
        chartData: [],
        drift: 0,
        fixedBaseline: 0,
        cappedFixedBaseline: 0,
        lastHistoricalMonth: null as string | null,
      };
    }

    // Aggregate monthly expenses by month (converted to base currency)
    const byMonth: Record<string, number> = {};
    monthlyStats.forEach((s) => {
      if (!byMonth[s.month]) byMonth[s.month] = 0;
      const wallet = walletMap.get(s.wallet_id ?? "");
      const currency = wallet?.currency ?? baseCurrency;
      const expense =
        Math.abs(
          convertCurrency(
            s.outcome_cents,
            currency,
            baseCurrency,
            conversionRates,
          ),
        ) / 100;
      byMonth[s.month] += expense;
    });

    const months = Object.keys(byMonth).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    // 3-month rolling average
    const raw = months.map((month) => ({
      month,
      expense: byMonth[month],
    }));

    const historicalData = raw.map((point, i) => {
      const window = raw.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((sum, p) => sum + p.expense, 0) / window.length;
      return { ...point, rolling: avg, isForecast: false };
    });

    // Compute drift: compare first 3-month avg to last 3-month avg
    const firstWindow = historicalData.slice(
      0,
      Math.min(3, historicalData.length),
    );
    const lastWindow = historicalData.slice(
      Math.max(0, historicalData.length - 3),
    );
    const firstAvg =
      firstWindow.reduce((s, p) => s + p.expense, 0) / firstWindow.length;
    const lastAvg =
      lastWindow.reduce((s, p) => s + p.expense, 0) / lastWindow.length;
    const driftPct = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

    // Compute fixed baseline from recurring expenses
    let fixed = 0;
    if (recurringTransactions) {
      const now = new Date();
      recurringTransactions.forEach((r) => {
        // Skip if ended
        if (r.end_date && new Date(r.end_date) < now) return;
        const wallet = walletMap.get(r.wallet_id);
        const currency = wallet?.currency ?? baseCurrency;
        let monthly = 0;
        const amtInBase =
          Math.abs(
            convertCurrency(
              r.amount_cents,
              currency,
              baseCurrency,
              conversionRates,
            ),
          ) / 100;
        switch (r.interval_type) {
          case "monthly":
            monthly = amtInBase;
            break;
          case "weekly":
            monthly = (amtInBase * 52) / 12;
            break;
          case "yearly":
            monthly = amtInBase / 12;
            break;
          case "quarterly":
            monthly = amtInBase / 3;
            break;
          default:
            monthly = amtInBase;
        }
        fixed += monthly;
      });
    }

    const forecastData =
      horizonMonths > 0 && historicalData.length > 0
        ? Array.from({ length: horizonMonths }, (_, index) => {
            const month = format(
              addMonths(
                parseMonthDate(historicalData[historicalData.length - 1].month),
                index + 1,
              ),
              "yyyy-MM-dd",
            );
            const expense = effectiveMonthlySpend;
            const rollingWindow = [
              ...historicalData.map((point) => point.expense),
              ...Array.from({ length: index + 1 }, () => expense),
            ].slice(-3);
            const rolling =
              rollingWindow.reduce((sum, value) => sum + value, 0) /
              rollingWindow.length;

            return {
              month,
              expense,
              rolling,
              isForecast: true,
            };
          })
        : [];

    const combinedData = [...historicalData, ...forecastData];

    const { cap, data: cappedData } = capChartOutliers(
      combinedData,
      ["expense", "rolling"],
      normalizationPercentile,
    );

    return {
      chartData: cappedData,
      drift: driftPct,
      fixedBaseline: fixed,
      cappedFixedBaseline: Math.min(fixed, cap),
      lastHistoricalMonth:
        historicalData[historicalData.length - 1]?.month ?? null,
    };
  }, [
    effectiveMonthlySpend,
    horizonMonths,
    monthlyStats,
    recurringTransactions,
    conversionRates,
    baseCurrency,
    walletMap,
    normalizationPercentile,
  ]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Burn Rate Drift</CardTitle>
          <CardDescription>
            Tracks whether your underlying monthly burn is drifting upward,
            stabilizing, or easing over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Burn Rate Drift</CardTitle>
          <CardDescription>
            Tracks whether your underlying monthly burn is drifting upward,
            stabilizing, or easing over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  const driftColor = drift > 10 ? "#ef4444" : drift > 0 ? "#f59e0b" : "#22c55e";
  const driftLabel =
    drift > 10
      ? "Rising — coercion risk increasing"
      : drift > 0
        ? "Slight creep — monitor"
        : "Stable or declining — autonomy conditions holding";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Burn Rate Drift</CardTitle>
        <CardDescription>
          <span style={{ color: driftColor }}>
            {drift >= 0 ? "+" : ""}
            {drift.toFixed(1)}% drift
          </span>{" "}
          — compared with the start of the period, your monthly spend trend is{" "}
          {driftLabel.toLowerCase()}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ComposedChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => format(parseMonthDate(v), "MMM yy")}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => formatCurrency(v, baseCurrency)}
            />
            {lastHistoricalMonth && (
              <ReferenceArea
                x1={lastHistoricalMonth}
                x2={chartData[chartData.length - 1]?.month}
                fill="#ffffff"
                fillOpacity={0.04}
                strokeOpacity={0}
              />
            )}
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as
                  | {
                      _original?: {
                        expense?: number;
                        rolling?: number;
                      };
                    }
                  | undefined;
                const expense =
                  point?._original?.expense ??
                  (payload.find((p) => p.dataKey === "expense")?.value as
                    | number
                    | undefined);
                const rolling =
                  point?._original?.rolling ??
                  (payload.find((p) => p.dataKey === "rolling")?.value as
                    | number
                    | undefined);
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">
                      {format(parseMonthDate(label), "MMMM yyyy")}
                      {point?.isForecast ? " · projected" : ""}
                    </div>
                    {expense !== undefined && (
                      <div className="text-sm">
                        Spend:{" "}
                        <span className="font-bold">
                          <Money
                            cents={Math.round(expense * 100)}
                            currency={baseCurrency}
                          />
                        </span>
                      </div>
                    )}
                    {rolling !== undefined && (
                      <div className="text-muted-foreground text-sm">
                        3-month avg:{" "}
                        <Money
                          cents={Math.round(rolling * 100)}
                          currency={baseCurrency}
                        />
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {fixedBaseline > 0 && (
              <ReferenceLine
                y={cappedFixedBaseline}
                stroke="#6b7280"
                strokeDasharray="4 4"
                label={{
                  value:
                    cappedFixedBaseline < fixedBaseline
                      ? "fixed floor (capped)"
                      : "fixed floor",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#6b7280",
                }}
              />
            )}
            <Bar
              dataKey="expense"
              name="Monthly Spend"
              fill="#ef4444"
              fillOpacity={0.6}
              radius={[2, 2, 0, 0]}
            />
            <Line
              dataKey="rolling"
              name="3-Month Avg"
              type="monotone"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
