"use client";

import { useMemo } from "react";
import { addMonths, format } from "date-fns";
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
  calculateTrimmedMean,
  calculateWeightedTrend,
  formatCurrency,
  parseMonthDate,
} from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import {
  getMonthlyStats,
  getWalletMonthlyBalances,
} from "@/utils/supabase/queries";

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
  const [, walletMap] = useWallets();
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

  const { data: monthlyStats, isLoading: loadingStats } = useQuery({
    queryKey: ["autonomy-horizon-stats", walletId, from, to],
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

  const isLoading = loadingBalances || loadingStats;

  const chartData = useMemo(() => {
    if (!monthlyBalances || !monthlyStats || monthlyBalances.length === 0) {
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

    // Sum all wallets into a single total balance per month
    const historicalPoints = historicalTotals.map((point) => ({
      month: point.month,
      balance: walletIds.reduce(
        (sum, wid) => sum + ((point[wid] as number) || 0),
        0,
      ),
    }));

    // Compute average monthly net change (weighted trend) using a simplified version
    // using the per-month stats for income/expense
    const byMonth: Record<string, number> = {};
    monthlyStats.forEach((s) => {
      if (!byMonth[s.month]) byMonth[s.month] = 0;
      const wallet = walletMap.get(s.wallet_id ?? "");
      const currency = wallet?.currency ?? baseCurrency;
      const net =
        convertCurrency(s.net_cents, currency, baseCurrency, conversionRates) /
        100;
      byMonth[s.month] += net;
    });

    const netChanges = Object.keys(byMonth)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((m) => byMonth[m]);

    // Base monthly net change (trimmed mean of recent 12)
    const recent = netChanges.slice(-12);
    const baseChange = calculateTrimmedMean(recent);

    // Monthly burn = trimmed mean of |expense|
    const allExpenses = monthlyStats
      .filter((s) => s.outcome_cents !== 0)
      .map((s) => {
        const wallet = walletMap.get(s.wallet_id ?? "");
        const currency = wallet?.currency ?? baseCurrency;
        return (
          Math.abs(
            convertCurrency(
              s.outcome_cents,
              currency,
              baseCurrency,
              conversionRates,
            ),
          ) / 100
        );
      });

    // Group by month for proper monthly totals
    const expByMonth: Record<string, number> = {};
    monthlyStats.forEach((s) => {
      if (!expByMonth[s.month]) expByMonth[s.month] = 0;
      const wallet = walletMap.get(s.wallet_id ?? "");
      const currency = wallet?.currency ?? baseCurrency;
      expByMonth[s.month] +=
        Math.abs(
          convertCurrency(s.outcome_cents, currency, baseCurrency, conversionRates),
        ) / 100;
    });
    const monthlyBurns = Object.values(expByMonth).filter((v) => v > 0);
    const avgBurn = calculateTrimmedMean(monthlyBurns);

    // Burn reduction/increase for scenarios
    const burnDelta = avgBurn * 0.2; // 20% of avg monthly burn

    // Last known balance
    const lastBalance =
      historicalPoints.length > 0
        ? historicalPoints[historicalPoints.length - 1].balance
        : 0;
    const lastMonth = new Date(
      historicalPoints[historicalPoints.length - 1].month,
    );

    // Build historical data
    const result = historicalPoints.map((p) => ({
      month: p.month,
      balance: p.balance,
      optimistic: undefined as number | undefined,
      pessimistic: undefined as number | undefined,
      isForecast: false,
    }));

    // Build forecast data
    let balCurrent = lastBalance;
    let balOpt = lastBalance;
    let balPess = lastBalance;

    for (let i = 1; i <= horizonMonths; i++) {
      const forecastMonth = addMonths(lastMonth, i);
      const monthKey = format(forecastMonth, "yyyy-MM-dd");

      balCurrent += baseChange;
      // Optimistic: burn -20% → net change improves by burnDelta
      balOpt += baseChange + burnDelta;
      // Pessimistic: burn +20% → net change worsens by burnDelta
      balPess += baseChange - burnDelta;

      result.push({
        month: monthKey,
        balance: Math.max(0, balCurrent),
        optimistic: Math.max(0, balOpt),
        pessimistic: Math.max(0, balPess),
        isForecast: true,
      });
    }

    return result;
  }, [
    monthlyBalances,
    monthlyStats,
    conversionRates,
    baseCurrency,
    walletMap,
    walletId,
    horizonMonths,
  ]);

  const todayKey = format(new Date(), "yyyy-MM-dd");

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
        <CardTitle>Autonomy Horizon</CardTitle>
        <CardDescription>
          {horizonMonths}-month runway — three scenarios at current, −20% and
          +20% burn rate ({baseCurrency})
        </CardDescription>
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
