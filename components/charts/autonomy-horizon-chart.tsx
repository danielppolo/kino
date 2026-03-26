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
import { Money } from "@/components/ui/money";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import {
  calculateMonthlyTotals,
  formatCurrency,
  parseMonthDate,
} from "@/utils/chart-helpers";
import { createClient } from "@/utils/supabase/client";
import { getWalletMonthlyBalances } from "@/utils/supabase/queries";
import type { ForecastApiResponse } from "@/app/api/forecast/route";

interface AutonomyHorizonChartProps {
  walletId?: string;
  from?: string;
  to?: string;
  /** Minimum balance (in base currency) below which forced re-entry is assumed. Defaults to 0. */
  coercionFloor?: number;
  /** How many months to project forward. Defaults to 36. */
  horizonMonths?: number;
}

const chartConfig: ChartConfig = {
  balance: {
    label: "Current trajectory",
    color: "#3b82f6",
  },
  optimistic: {
    label: "−20% burn",
    color: "#22c55e",
  },
  pessimistic: {
    label: "+20% burn",
    color: "#ef4444",
  },
};

export function AutonomyHorizonChart({
  walletId,
  from,
  to,
  coercionFloor = 0,
  horizonMonths = 36,
}: AutonomyHorizonChartProps) {
  const [wallets, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

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

  // ARIMA forecast — server-side, cached 1 hour
  const { data: forecastData, isLoading: loadingForecast } = useQuery({
    queryKey: ["autonomy-arima", walletId, baseCurrency],
    queryFn: async (): Promise<ForecastApiResponse> => {
      const workspaceWalletIds = wallets.map((w) => w.id);
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: walletId ?? null,
          walletIds: workspaceWalletIds,
          horizon: horizonMonths,
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

    // Sum all wallets into a single total balance per historical month
    const historicalPoints = historicalTotals.map((point) => ({
      month: point.month,
      balance: walletIds.reduce(
        (sum, wid) => sum + ((point[wid] as number) || 0),
        0,
      ),
    }));

    // Build historical result rows (no scenario bands yet)
    const result = historicalPoints.map((p) => ({
      month: p.month,
      balance: p.balance,
      optimistic: undefined as number | undefined,
      pessimistic: undefined as number | undefined,
      isForecast: false,
    }));

    const lastBalance =
      historicalPoints.length > 0
        ? historicalPoints[historicalPoints.length - 1].balance
        : 0;

    // Burn delta for scenario bands — 20% of the server-computed avg burn rate
    const burnDelta = forecastData.avgMonthlyBurn * 0.2;

    // ARIMA returns absolute balance forecasts.
    // Derive cumulative optimistic/pessimistic by adding/subtracting burnDelta
    // per month from the ARIMA base trajectory.
    forecastData.forecast.forEach((p, i) => {
      const cumDelta = burnDelta * (i + 1);
      result.push({
        month: p.month,
        balance: Math.max(0, p.value),
        optimistic: Math.max(0, p.value + cumDelta),
        pessimistic: Math.max(0, p.value - cumDelta),
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
  ]);

  const todayKey = format(new Date(), "yyyy-MM-dd");

  const methodLabel = forecastData?.metadata.method ?? null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autonomy Horizon</CardTitle>
          <CardDescription>
            Projected runway — how long until forced re-entry?
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
          <CardTitle>Autonomy Horizon</CardTitle>
          <CardDescription>
            Projected runway — how long until forced re-entry?
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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Autonomy Horizon</CardTitle>
            <CardDescription>
              {horizonMonths}-month runway — three scenarios at current, −20%
              and +20% burn rate ({baseCurrency})
            </CardDescription>
          </div>
          {methodLabel && (
            <span className="text-muted-foreground rounded border px-2 py-0.5 text-xs font-mono">
              {methodLabel}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
          >
            <defs>
              <linearGradient id="gradOpt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                const opt = payload.find((p) => p.dataKey === "optimistic")
                  ?.value as number | undefined;
                const pess = payload.find((p) => p.dataKey === "pessimistic")
                  ?.value as number | undefined;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm min-w-36">
                    <div className="text-sm font-medium mb-1">
                      {format(parseMonthDate(label), "MMMM yyyy")}
                    </div>
                    {base !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">Base</span>
                        <Money
                          cents={Math.round(base * 100)}
                          currency={baseCurrency}
                        />
                      </div>
                    )}
                    {opt !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-[#22c55e]">−20% burn</span>
                        <Money
                          cents={Math.round(opt * 100)}
                          currency={baseCurrency}
                        />
                      </div>
                    )}
                    {pess !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-[#ef4444]">+20% burn</span>
                        <Money
                          cents={Math.round(pess * 100)}
                          currency={baseCurrency}
                        />
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {/* Coercion floor */}
            {coercionFloor >= 0 && (
              <ReferenceLine
                y={coercionFloor}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                label={{
                  value: "coercion floor",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#ef4444",
                }}
              />
            )}
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
            <Area
              dataKey="pessimistic"
              name="+20% burn"
              type="monotone"
              fill="url(#gradPess)"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
            />
            <Area
              dataKey="optimistic"
              name="−20% burn"
              type="monotone"
              fill="url(#gradOpt)"
              stroke="#22c55e"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
            />
            <Area
              dataKey="balance"
              name="Current trajectory"
              type="monotone"
              fill="url(#gradBase)"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
