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
  ChartTooltip,
} from "@/components/ui/chart";
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import {
  calculateMonthlyTotals,
  calculateTrimmedMean,
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

const chartConfig: ChartConfig = {
  years: {
    label: "Years of Autonomy",
    color: "#3b82f6",
  },
};

export function SufficiencyRatioChart({
  walletId,
  from,
  to,
}: SufficiencyRatioChartProps) {
  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

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

  const isLoading = loadingBalances || loadingStats;

  const { chartData, currentYears } = useMemo(() => {
    if (!monthlyBalances || !monthlyStats || monthlyStats.length === 0) {
      return { chartData: [], currentYears: 0 };
    }

    // Monthly totals per wallet per month (converted to base currency)
    const balancesByMonth = calculateMonthlyTotals(
      monthlyBalances,
      conversionRates,
      baseCurrency,
      walletMap,
      walletId,
    );

    // Compute annualized burn rate from all monthly expenses
    const monthlyExpenses = monthlyStats
      .filter((s) => s.outcome_cents !== 0)
      .map((s) => {
        const wallet = walletMap.get(s.wallet_id ?? "");
        if (!wallet) return Math.abs(s.outcome_cents) / 100;
        return (
          Math.abs(
            convertCurrency(
              s.outcome_cents,
              wallet.currency,
              baseCurrency,
              conversionRates,
            ),
          ) / 100
        );
      });

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
    const avgMonthlyBurn = calculateTrimmedMean(monthlyExpenseTotals);
    const annualBurn = avgMonthlyBurn * 12;

    if (annualBurn === 0) return { chartData: [], currentYears: 0 };

    const walletIds = walletId
      ? [walletId]
      : Array.from(
          new Set(monthlyBalances.map((b) => b.wallet_id)),
        );

    const data = balancesByMonth
      .map((point) => {
        const totalBalance = walletIds.reduce((sum, wid) => {
          return sum + ((point[wid] as number) || 0);
        }, 0);
        return {
          month: point.month,
          years: Math.max(0, totalBalance / annualBurn),
        };
      })
      .filter((p) => p.years > 0);

    const current = data.length > 0 ? data[data.length - 1].years : 0;
    return { chartData: data, currentYears: current };
  }, [monthlyBalances, monthlyStats, conversionRates, baseCurrency, walletMap, walletId]);

  const percentageChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const prev = chartData[chartData.length - 2].years;
    const curr = chartData[chartData.length - 1].years;
    if (prev === 0) return 0;
    return ((curr - prev) / prev) * 100;
  }, [chartData]);

  const currentLabel = useMemo(() => {
    if (currentYears >= 25) return "Irreversible autonomy";
    if (currentYears >= 10) return "Stable autonomy";
    if (currentYears >= 5) return "Fragile autonomy";
    return "Below safety threshold";
  }, [currentYears]);

  const areaColor = useMemo(() => {
    if (currentYears >= 10) return "#22c55e";
    if (currentYears >= 5) return "#f59e0b";
    return "#ef4444";
  }, [currentYears]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sufficiency Ratio</CardTitle>
          <CardDescription>
            Shows how many years your current reserves could fund your lifestyle at
            the average burn rate.
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
          <CardTitle>Sufficiency Ratio</CardTitle>
          <CardDescription>
            Shows how many years your current reserves could fund your lifestyle at
            the average burn rate.
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
          <span className="ml-3 text-2xl font-bold" style={{ color: areaColor }}>
            {currentYears.toFixed(1)} yrs
          </span>
        </CardTitle>
        <CardDescription>
          {currentLabel} — if spending stayed near its average pace, your current
          reserves would fund roughly {currentYears.toFixed(1)} years of autonomy in{" "}
          {baseCurrency}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{ years: { label: "Years", color: areaColor } }}>
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
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `${v.toFixed(0)}y`}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const years = payload[0]?.value as number;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="text-sm font-medium mb-1">
                      {format(parseMonthDate(label), "MMMM yyyy")}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">{years.toFixed(1)}</span> years of autonomy
                    </div>
                  </div>
                );
              }}
            />
            {/* Threshold reference lines */}
            <ReferenceLine
              y={5}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: "5y — fragile", position: "insideTopRight", fontSize: 10, fill: "#ef4444" }}
            />
            <ReferenceLine
              y={10}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: "10y — stable", position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }}
            />
            <ReferenceLine
              y={25}
              stroke="#22c55e"
              strokeDasharray="4 4"
              label={{ value: "25y — irreversible", position: "insideTopRight", fontSize: 10, fill: "#22c55e" }}
            />
            <Area
              dataKey="years"
              name="Years of Autonomy"
              type="monotone"
              fill={areaColor}
              fillOpacity={0.15}
              stroke={areaColor}
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
