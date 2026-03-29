"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
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
import { useChartControls } from "@/components/charts/shared/chart-controls-context";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import {
  calculateMonthlyTotals,
  formatCurrency,
  parseMonthDate,
} from "@/utils/chart-helpers";
import { createClient } from "@/utils/supabase/client";
import { getWalletMonthlyBalances } from "@/utils/supabase/queries";
import type { ForecastApiResponse } from "@/app/api/forecast/route";
import { Money } from "../ui/money";

interface AutonomyHorizonChartProps {
  walletId?: string;
  from?: string;
  to?: string;
  /** How many months to project forward. Defaults to 36. */
  horizonMonths?: number;
}

const chartConfig: ChartConfig = {
  balance: {
    label: "With income (forecast)",
    color: "#3b82f6",
  },
  noIncome: {
    label: "No income",
    color: "#ef4444",
  },
};

export function AutonomyHorizonChart({
  walletId,
  from,
  to,
  horizonMonths = 36,
}: AutonomyHorizonChartProps) {
  const [wallets, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();
  const controls = useChartControls();
  const effectiveHorizonMonths =
    (controls?.forecastHorizonYears ??
      Math.max(1, Math.round(horizonMonths / 12))) * 12;
  const forecastMode = controls?.forecastMode ?? "with-income";

  const { data: monthlyBalances, isLoading: loadingBalances } = useQuery({
    queryKey: ["autonomy-horizon-balances", walletId, from, to],
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

  const { data: forecastData, isLoading: loadingForecast } = useQuery({
    queryKey: ["autonomy-arima", walletId, baseCurrency, effectiveHorizonMonths],
    queryFn: async (): Promise<ForecastApiResponse> => {
      const workspaceWalletIds = wallets.map((w) => w.id);
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: walletId ?? null,
          walletIds: workspaceWalletIds,
          horizon: effectiveHorizonMonths,
          baseCurrency,
          conversionRates,
        }),
      });
      if (!res.ok) throw new Error("Forecast API failed");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });

  const isLoading = loadingBalances || loadingForecast;
  const effectiveBurnRate =
    controls?.monthlySpend ??
    controls?.defaultMonthlySpend ??
    forecastData?.avgMonthlyBurn ??
    0;
  const emphasizeNoIncome = forecastMode === "no-income";

  const chartData = useMemo(() => {
    if (!monthlyBalances || !forecastData || monthlyBalances.length === 0) {
      return [];
    }

    const historicalTotals = calculateMonthlyTotals(
      monthlyBalances,
      conversionRates,
      baseCurrency,
      walletMap,
      walletId,
    );
    if (historicalTotals.length === 0) return [];

    const walletIds = walletId
      ? [walletId]
      : Array.from(new Set(monthlyBalances.map((b) => b.wallet_id)));

    const historicalPoints = historicalTotals.map((point) => ({
      month: point.month,
      balance: walletIds.reduce(
        (sum, wid) => sum + ((point[wid] as number) || 0),
        0,
      ),
    }));

    const lastBalance =
      historicalPoints.length > 0
        ? historicalPoints[historicalPoints.length - 1].balance
        : 0;

    // Anchor the ARIMA forecast to the actual current balance (same fix as
    // forecast-line-chart: shift all values so the first forecast point equals
    // the bridge, preserving the slope throughout).
    const firstForecastRaw = forecastData.forecast[0]?.value ?? lastBalance;
    const anchorDelta = lastBalance - firstForecastRaw;

    // Historical rows — bridge the last point for both series
    const result: {
      month: string;
      balance: number;
      noIncome: number | undefined;
      isForecast: boolean;
    }[] = historicalPoints.map((p, i) => ({
      month: p.month,
      balance: p.balance,
      noIncome: i === historicalPoints.length - 1 ? p.balance : undefined,
      isForecast: false,
    }));

    // Forecast rows
    forecastData.forecast.forEach((p, i) => {
      result.push({
        month: p.month,
        balance: Math.max(0, p.value + anchorDelta),
        noIncome: Math.max(0, lastBalance - effectiveBurnRate * (i + 1)),
        isForecast: true,
      });
    });

    return result;
  }, [
    monthlyBalances,
    forecastData,
    conversionRates,
    baseCurrency,
    walletMap,
    walletId,
    effectiveBurnRate,
  ]);

  // Runway: first forecast month where no-income balance hits zero
  const runwayMonth = useMemo(() => {
    const forecastPoints = chartData.filter((p) => p.isForecast);
    const hit = forecastPoints.find((p) => (p.noIncome ?? Infinity) <= 0);
    return hit?.month ?? null;
  }, [chartData]);

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const methodLabel = forecastData?.metadata.method ?? null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autonomy Horizon</CardTitle>
          <CardDescription>
            Forecasted balance runway showing the path with income versus a zero-income
            burn-down at your current monthly spend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autonomy Horizon</CardTitle>
          <CardDescription>
            Forecasted balance runway showing the path with income versus a zero-income
            burn-down at your current monthly spend.
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
        <CardTitle>Autonomy Horizon</CardTitle>
        <CardDescription>
          Over the next {effectiveHorizonMonths} months, compare your projected
          balance path against how long your current reserves would last with no
          new income, measured in {baseCurrency}. The shared spend control
          adjusts the zero-income burn-down line.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
          >
            <defs>
              <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradNoIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const base = payload.find((p) => p.dataKey === "balance")
                  ?.value as number | undefined;
                const noInc = payload.find((p) => p.dataKey === "noIncome")
                  ?.value as number | undefined;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm min-w-40">
                    <div className="text-sm font-medium mb-1">
                      {format(parseMonthDate(label), "MMMM yyyy")}
                    </div>
                    {base !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span
                          className={
                            emphasizeNoIncome ? "text-muted-foreground" : "text-[#3b82f6]"
                          }
                        >
                          With income
                        </span>
                        <Money
                          cents={Math.round(base * 100)}
                          currency={baseCurrency}
                        />
                      </div>
                    )}
                    {noInc !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span
                          className={
                            emphasizeNoIncome ? "text-[#ef4444]" : "text-muted-foreground"
                          }
                        >
                          No income
                        </span>
                        <Money
                          cents={Math.round(noInc * 100)}
                          currency={baseCurrency}
                        />
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Today marker */}
            <ReferenceLine
              x={todayKey}
              stroke="#6b7280"
              strokeDasharray="3 3"
              label={{
                value: "today",
                position: "insideTopLeft",
                fontSize: 10,
                fill: "#6b7280",
              }}
            />

            {/* Runway marker — where no-income line hits zero */}
            {runwayMonth && (
              <ReferenceLine
                x={runwayMonth}
                stroke="#ef4444"
                strokeDasharray="4 2"
                label={{
                  value: "runway end",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#ef4444",
                }}
              />
            )}

            <Area
              dataKey="noIncome"
              name="No income"
              type="monotone"
              fill="url(#gradNoIncome)"
              stroke="#ef4444"
              fillOpacity={emphasizeNoIncome ? 1 : 0.2}
              strokeOpacity={emphasizeNoIncome ? 1 : 0.35}
              strokeWidth={emphasizeNoIncome ? 2 : 1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
            />
            <Area
              dataKey="balance"
              name="With income (forecast)"
              type="monotone"
              fill="url(#gradBase)"
              stroke="#3b82f6"
              fillOpacity={emphasizeNoIncome ? 0.2 : 1}
              strokeOpacity={emphasizeNoIncome ? 0.35 : 1}
              strokeWidth={emphasizeNoIncome ? 1.5 : 2}
              dot={false}
              connectNulls={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex items-end justify-between gap-8">
        <p className="text-muted-foreground text-sm">
          {runwayMonth ? (
            <>
              At{" "}
              <Money
                cents={Math.round(effectiveBurnRate * 100)}
                currency={baseCurrency}
              />{" "}
              /month with no income, runway ends{" "}
              <span className="text-foreground font-medium">
                {format(parseMonthDate(runwayMonth), "MMMM yyyy")}
              </span>
              .
            </>
          ) : (
            <span>
              Runway exceeds the {effectiveHorizonMonths}-month horizon at this burn
              rate.
            </span>
          )}
          {methodLabel && (
            <span className="text-muted-foreground ml-2 rounded border px-2 py-0.5 text-xs font-mono align-middle">
              {methodLabel}
            </span>
          )}
        </p>
      </CardFooter>
    </Card>
  );
}
