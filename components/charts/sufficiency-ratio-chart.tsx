"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
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
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import {
  calculateMonthlyTotals,
  calculateTrimmedMean,
  formatCurrency,
  parseMonthDate,
} from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import {
  getMonthlyStats,
  getWalletMonthlyBalances,
} from "@/utils/supabase/queries";

interface SufficiencyRatioChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const MAX_SUFFICIENCY_YEARS = 50;

export function SufficiencyRatioChart({
  walletId,
  from,
  to,
}: SufficiencyRatioChartProps) {
  const [wallets, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();
  const controls = useChartControls();
  const forecastMode = controls?.forecastMode ?? "with-income";
  const horizonYears = controls?.forecastHorizonYears ?? 1;
  const horizonMonths = horizonYears * 12;
  const futureLumpSum = controls?.futureLumpSum ?? 0;
  const workspaceWalletIds = wallets.map((w) => w.id);

  const { data: monthlyBalances, isLoading: loadingBalances } = useQuery({
    queryKey: ["sufficiency-ratio-balances", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getWalletMonthlyBalances(supabase, {
        walletId,
        from,
        to,
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: monthlyStats, isLoading: loadingStats } = useQuery({
    queryKey: ["sufficiency-ratio-stats", walletId, from, to],
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

  const { data: forecastData, isLoading: loadingForecast } = useForecastQuery({
    walletId,
    walletIds: workspaceWalletIds,
    horizonMonths,
    baseCurrency,
    conversionRates,
  });

  const isLoading = loadingBalances || loadingStats || loadingForecast;

  const {
    chartData,
    currentYears,
    projectedYears,
    avgMonthlyBurn,
    lastHistoricalMonth,
  } = useMemo(() => {
    if (!monthlyBalances || !monthlyStats || monthlyStats.length === 0) {
      return {
        chartData: [],
        currentYears: 0,
        projectedYears: 0,
        avgMonthlyBurn: 0,
        lastHistoricalMonth: null as string | null,
      };
    }

    // Monthly totals per wallet per month (converted to base currency)
    const balancesByMonth = calculateMonthlyTotals(
      monthlyBalances,
      conversionRates,
      baseCurrency,
      walletMap,
      walletId,
    );

    // Group expenses by month to get monthly totals
    const expenseByMonth: Record<string, number> = {};
    monthlyStats.forEach((s) => {
      if (!expenseByMonth[s.month]) expenseByMonth[s.month] = 0;
      const wallet = walletMap.get(s.wallet_id ?? "");
      const exp = wallet
        ? Math.abs(
            convertCurrency(
              s.outcome_cents,
              wallet.currency,
              baseCurrency,
              conversionRates,
            ),
          ) / 100
        : Math.abs(s.outcome_cents) / 100;
      expenseByMonth[s.month] += exp;
    });

    const monthlyExpenseTotals = Object.values(expenseByMonth).filter(
      (v) => v > 0,
    );
    const baselineMonthlyBurn = calculateTrimmedMean(monthlyExpenseTotals);
    const effectiveMonthlyBurn =
      controls?.effectiveMonthlySpend ??
      controls?.defaultMonthlySpend ??
      forecastData?.avgMonthlyBurn ??
      baselineMonthlyBurn;
    const annualBurn = effectiveMonthlyBurn * 12;

    const walletIds = walletId
      ? [walletId]
      : Array.from(new Set(monthlyBalances.map((b) => b.wallet_id)));

    const data = balancesByMonth
      .map((point) => {
        const totalBalance = walletIds.reduce((sum, wid) => {
          return sum + ((point[wid] as number) || 0);
        }, 0);
        return {
          month: point.month,
          years:
            annualBurn > 0
              ? Math.max(0, totalBalance / annualBurn)
              : MAX_SUFFICIENCY_YEARS,
          forecast: null as number | null,
          isForecast: false,
        };
      })
      .filter((p) => p.years > 0);

    const current = data.length > 0 ? data[data.length - 1].years : 0;
    const lastBalancePoint = data[data.length - 1];
    const lastBalance = annualBurn > 0 ? current * annualBurn : 0;
    const firstForecastRaw = forecastData?.forecast[0]?.value ?? lastBalance;
    const anchorDelta = lastBalance - firstForecastRaw;

    const withIncomeForecast = (forecastData?.forecast ?? []).map(
      (point, index, forecast) => {
        const adjustedValue =
          point.value +
          anchorDelta +
          (index === forecast.length - 1 ? futureLumpSum : 0);
        return {
          month: point.month,
          years: null as number | null,
          forecast:
            annualBurn > 0
              ? Math.max(0, adjustedValue / annualBurn)
              : MAX_SUFFICIENCY_YEARS,
          isForecast: true,
        };
      },
    );

    const noIncomeForecast = (forecastData?.forecast ?? []).map(
      (point, index, forecast) => {
        const adjustedValue =
          lastBalance -
          effectiveMonthlyBurn * (index + 1) +
          (index === forecast.length - 1 ? futureLumpSum : 0);
        return {
          month: point.month,
          years: null as number | null,
          forecast:
            annualBurn > 0
              ? Math.max(0, adjustedValue / annualBurn)
              : MAX_SUFFICIENCY_YEARS,
          isForecast: true,
        };
      },
    );

    const activeForecast =
      forecastMode === "with-income" ? withIncomeForecast : noIncomeForecast;
    const chartDataWithForecast =
      lastBalancePoint && activeForecast.length > 0
        ? [
            ...data.slice(0, -1),
            {
              ...lastBalancePoint,
              forecast: lastBalancePoint.years,
            },
            ...activeForecast,
          ]
        : data;

    const projected =
      activeForecast.length > 0
        ? (activeForecast[activeForecast.length - 1].forecast ?? current)
        : current;

    return {
      chartData: chartDataWithForecast,
      currentYears: current,
      projectedYears: projected,
      avgMonthlyBurn: baselineMonthlyBurn,
      lastHistoricalMonth: data[data.length - 1]?.month ?? null,
    };
  }, [
    monthlyBalances,
    monthlyStats,
    forecastData,
    conversionRates,
    baseCurrency,
    walletMap,
    walletId,
    controls?.effectiveMonthlySpend,
    controls?.defaultMonthlySpend,
    forecastMode,
    futureLumpSum,
  ]);

  const percentageChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const prev =
      chartData[chartData.length - 2].forecast ??
      chartData[chartData.length - 2].years ??
      0;
    const curr =
      chartData[chartData.length - 1].forecast ??
      chartData[chartData.length - 1].years ??
      0;
    if (prev === 0) return 0;
    return ((curr - prev) / prev) * 100;
  }, [chartData]);

  const effectiveMonthlyBurn =
    controls?.effectiveMonthlySpend ??
    controls?.defaultMonthlySpend ??
    avgMonthlyBurn;

  const currentLabel = useMemo(() => {
    if (effectiveMonthlyBurn === 0) return "Effectively unbounded autonomy";
    if (projectedYears >= 25) return "Irreversible autonomy";
    if (projectedYears >= 10) return "Stable autonomy";
    if (projectedYears >= 5) return "Fragile autonomy";
    return "Below safety threshold";
  }, [projectedYears, effectiveMonthlyBurn]);

  const areaColor = useMemo(() => {
    if (projectedYears >= 10) return "#22c55e";
    if (projectedYears >= 5) return "#f59e0b";
    return "#ef4444";
  }, [projectedYears]);

  const yAxisDomain = useMemo(() => {
    const maxValue = chartData.reduce((max, point) => {
      const pointMax = Math.max(point.years ?? 0, point.forecast ?? 0);
      return Math.max(max, pointMax);
    }, 0);

    if (maxValue <= 0) return [0, 1] as const;
    return [0, Math.ceil(maxValue)] as const;
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sufficiency Ratio</CardTitle>
          <CardDescription>
            Shows how many years your current reserves could fund your lifestyle
            at the average burn rate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sufficiency Ratio</CardTitle>
          <CardDescription>
            Shows how many years your current reserves could fund your lifestyle
            at the average burn rate.
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Sufficiency Ratio
          <span
            className="ml-3 text-2xl font-bold"
            style={{ color: areaColor }}
          >
            {effectiveMonthlyBurn === 0
              ? `${MAX_SUFFICIENCY_YEARS}+ yrs`
              : `${projectedYears.toFixed(1)} yrs`}
          </span>
        </CardTitle>
        <CardDescription>
          {effectiveMonthlyBurn === 0 ? (
            <>
              {currentLabel} — at{" "}
              <strong>
                {formatCurrency(effectiveMonthlyBurn, baseCurrency)}
              </strong>{" "}
              monthly spend, this view is capped at {MAX_SUFFICIENCY_YEARS}+
              years of autonomy in {baseCurrency}.
            </>
          ) : (
            <>
              {currentLabel} — at a monthly spend of{" "}
              <strong>
                {formatCurrency(effectiveMonthlyBurn, baseCurrency)}
              </strong>
              , your reserves move from roughly {currentYears.toFixed(1)} years
              today to {projectedYears.toFixed(1)} projected years of autonomy
              in {baseCurrency} after {horizonYears} forecast year
              {horizonYears > 1 ? "s" : ""}
              {futureLumpSum > 0
                ? ` and a final ${formatCurrency(futureLumpSum, baseCurrency)} lump sum`
                : ""}
              .
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ years: { label: "Years", color: areaColor } }}
        >
          <AreaChart
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
              domain={yAxisDomain}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `${v.toFixed(0)}y`}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const yearsEntry =
                  payload.find((item) => item.dataKey === "forecast") ??
                  payload.find((item) => item.dataKey === "years");
                const years = (yearsEntry?.value as number | undefined) ?? 0;
                const point = yearsEntry?.payload as
                  | { isForecast?: boolean }
                  | undefined;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">
                      {format(parseMonthDate(label), "MMMM yyyy")}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">{years.toFixed(1)}</span>{" "}
                      {point?.isForecast ? "projected" : "historical"} years of
                      autonomy
                    </div>
                  </div>
                );
              }}
            />
            {lastHistoricalMonth && (
              <ReferenceLine
                x={lastHistoricalMonth}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{ value: "Today", position: "top" }}
              />
            )}
            {/* Threshold reference lines */}
            <ReferenceLine
              y={5}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{
                value: "5y — fragile",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#ef4444",
              }}
            />
            <ReferenceLine
              y={10}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{
                value: "10y — stable",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#f59e0b",
              }}
            />
            <ReferenceLine
              y={25}
              stroke="#22c55e"
              strokeDasharray="4 4"
              label={{
                value: "25y — irreversible",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#22c55e",
              }}
            />
            <Area
              dataKey="years"
              name="Years of Autonomy"
              type="monotone"
              fill={areaColor}
              fillOpacity={0.15}
              stroke={areaColor}
              connectNulls={false}
            />
            <Area
              dataKey="forecast"
              name="Projected autonomy"
              type="monotone"
              fill={areaColor}
              fillOpacity={0.15}
              stroke={areaColor}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
            />
            <Line
              dataKey="forecast"
              name="Projected autonomy"
              type="monotone"
              stroke={areaColor}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <TrendingIndicator
          percentageChange={percentageChange}
          startDate={chartData[0]?.month}
          endDate={chartData[chartData.length - 1]?.month}
        />
      </CardFooter>
    </Card>
  );
}
