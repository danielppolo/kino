"use client";

import React from "react";
import { format } from "date-fns";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useQuery } from "@tanstack/react-query";

import { ChartSkeleton } from "@/components/charts/shared/chart-skeleton";
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
import { Money } from "@/components/ui/money";
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { formatCurrency, parseMonthDate } from "@/utils/chart-helpers";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyBillStats } from "@/utils/supabase/queries";
import { Wallet } from "@/utils/supabase/types";

interface BillsHistoryChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface ChartDataPoint {
  month: string;
  [key: string]: number | string;
}

export function BillsHistoryChart({
  walletId,
  from,
  to,
}: BillsHistoryChartProps) {
  const {
    data: monthlyBillStats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bills-history-chart", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyBillStats(supabase, {
        walletId,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const [wallets, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  // Process data to calculate accumulated debt over time
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!monthlyBillStats || monthlyBillStats.length === 0) return [];

    // Sort by month first
    const sortedStats = [...monthlyBillStats].sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    // Track accumulated debt per wallet
    const accumulatedDebt: Record<string, number> = {};

    // Get all unique months
    const allMonths = Array.from(
      new Set(sortedStats.map((s) => s.month)),
    ).sort();

    // Calculate accumulated debt for each month
    return allMonths.map((month) => {
      const dataPoint: ChartDataPoint = { month };

      // Get stats for this month
      const monthStats = sortedStats.filter((s) => s.month === month);

      monthStats.forEach((stat) => {
        const wallet = walletMap.get(stat.wallet_id);
        if (!wallet) return;

        const rate = conversionRates[wallet.currency]?.rate ?? 1;
        const outstandingThisMonth =
          (stat.total_outstanding_cents * rate) / 100;

        // Initialize if first time seeing this wallet
        if (accumulatedDebt[wallet.id] === undefined) {
          accumulatedDebt[wallet.id] = 0;
        }

        // Add this month's outstanding to accumulated
        accumulatedDebt[wallet.id] += outstandingThisMonth;

        // Set the accumulated value for this month
        dataPoint[wallet.id] = accumulatedDebt[wallet.id];
      });

      // For wallets that don't have data this month, carry forward previous value
      Object.keys(accumulatedDebt).forEach((walletId) => {
        if (dataPoint[walletId] === undefined) {
          dataPoint[walletId] = accumulatedDebt[walletId];
        }
      });

      return dataPoint;
    });
  }, [monthlyBillStats, conversionRates, walletMap]);

  // Get visible wallets
  let visibleWallets: Wallet[];
  if (walletId) {
    const wallet = walletMap.get(walletId);
    visibleWallets = wallet ? [wallet] : [];
  } else {
    const walletIds = new Set(monthlyBillStats?.map((b) => b.wallet_id) ?? []);
    visibleWallets = Array.from(walletMap.values()).filter((w) =>
      walletIds.has(w.id),
    );
  }

  const config = visibleWallets.reduce(
    (acc, wallet) => ({
      ...acc,
      [wallet.id]: {
        label: wallet.name,
        color: wallet.color || "hsl(var(--primary))",
      },
    }),
    {} as ChartConfig,
  );

  const chartConfig: ChartConfig = config;

  // Calculate percentage change
  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = visibleWallets.reduce((total: number, wallet: Wallet) => {
      const debt = (chartData[chartData.length - 1][wallet.id] as number) || 0;
      return total + debt;
    }, 0);
    const previous = visibleWallets.reduce((total: number, wallet: Wallet) => {
      const debt = (chartData[chartData.length - 2][wallet.id] as number) || 0;
      return total + debt;
    }, 0);
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const percentageChange = calculatePercentageChange();

  // Calculate current total debt
  const currentTotalDebt = React.useMemo(() => {
    if (chartData.length === 0) return 0;
    const lastMonth = chartData[chartData.length - 1];
    return visibleWallets.reduce((total: number, wallet: Wallet) => {
      return total + ((lastMonth[wallet.id] as number) || 0);
    }, 0);
  }, [chartData, visibleWallets]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accumulated Bills Debt</CardTitle>
          <CardDescription>
            Outstanding bills accumulated over time in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton variant="bar" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accumulated Bills Debt</CardTitle>
          <CardDescription>
            Outstanding bills accumulated over time in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-red-500">
            Error loading chart data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accumulated Bills Debt</CardTitle>
          <CardDescription>
            Outstanding bills accumulated over time in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No bills data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accumulated Bills Debt</CardTitle>
        <CardDescription>
          Outstanding bills accumulated over time in {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-3xl font-bold">
            <Money
              cents={Math.round(currentTotalDebt * 100)}
              currency={baseCurrency}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Current accumulated debt
          </p>
        </div>
        <ChartContainer config={chartConfig}>
          <LineChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) =>
                format(parseMonthDate(value), "MMM yyyy")
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
              domain={[0, "auto"]}
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) =>
                format(parseMonthDate(value), "MMMM yyyy")
              }
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {format(parseMonthDate(label), "MMMM yyyy")}
                        </span>
                      </div>
                      <div className="grid gap-1">
                        {payload.map((item) => {
                          const wallet = walletMap.get(item.dataKey as string);
                          if (!wallet) return null;
                          const debt = item.value as number;
                          return (
                            <div
                              key={item.dataKey}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: wallet.color ?? undefined,
                                  }}
                                />
                                <span className="text-sm">{wallet.name}</span>
                              </div>
                              <Money
                                cents={Math.round(debt * 100)}
                                currency={baseCurrency}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {visibleWallets.map((wallet) => (
              <Line
                key={wallet.id}
                dataKey={wallet.id}
                type="monotone"
                stroke={chartConfig[wallet.id].color}
                strokeWidth={2}
                dot={false}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <TrendingIndicator
          percentageChange={percentageChange}
          startDate={
            chartData.length > 0 ? (chartData[0].month as string) : undefined
          }
          endDate={
            chartData.length > 0
              ? (chartData[chartData.length - 1].month as string)
              : undefined
          }
        />
      </CardFooter>
    </Card>
  );
}
