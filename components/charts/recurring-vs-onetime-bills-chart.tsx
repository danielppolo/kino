"use client";

import React from "react";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import { Money } from "@/components/ui/money";
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { formatCurrency } from "@/utils/chart-helpers";
import { createClient } from "@/utils/supabase/client";
import { getRecurringVsOneTimeStats } from "@/utils/supabase/queries";

interface RecurringVsOnetimeBillsChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface ChartDataPoint {
  month: string;
  [key: string]: number | string;
}

export function RecurringVsOnetimeBillsChart({
  walletId,
  from,
  to,
}: RecurringVsOnetimeBillsChartProps) {
  const {
    data: billStats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["recurring-vs-onetime-bills", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getRecurringVsOneTimeStats(supabase, {
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

  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!billStats) return [];

    const monthGroups: Record<
      string,
      Record<
        string,
        {
          recurring: number;
          one_time: number;
        }
      >
    > = {};

    billStats.forEach((stat) => {
      if (!monthGroups[stat.month]) {
        monthGroups[stat.month] = {};
      }

      const wallet = walletMap.get(stat.wallet_id);
      if (!wallet) return;

      const rate = conversionRates[wallet.currency]?.rate ?? 1;

      const recurringAmount = (stat.recurring_bills_cents * rate) / 100;
      const oneTimeAmount = (stat.one_time_bills_cents * rate) / 100;

      if (!monthGroups[stat.month][wallet.id]) {
        monthGroups[stat.month][wallet.id] = {
          recurring: 0,
          one_time: 0,
        };
      }

      monthGroups[stat.month][wallet.id].recurring += recurringAmount;
      monthGroups[stat.month][wallet.id].one_time += oneTimeAmount;
    });

    return Object.entries(monthGroups)
      .map(([month, wallets]) => {
        const dataPoint: ChartDataPoint = { month };

        Object.entries(wallets).forEach(([walletId, values]) => {
          dataPoint[`${walletId}_recurring`] = values.recurring;
          dataPoint[`${walletId}_one_time`] = values.one_time;
        });

        return dataPoint;
      })
      .sort(
        (a, b) =>
          new Date(a.month as string).getTime() -
          new Date(b.month as string).getTime(),
      );
  }, [billStats, conversionRates, walletMap]);

  let visibleWallets;
  if (walletId) {
    const wallet = walletMap.get(walletId);
    visibleWallets = wallet ? [wallet] : [];
  } else {
    const walletIds = new Set(billStats?.map((b) => b.wallet_id) ?? []);
    visibleWallets = Array.from(walletMap.values()).filter((w) =>
      walletIds.has(w.id),
    );
  }

  const config = visibleWallets.reduce(
    (acc, wallet) => ({
      ...acc,
      [`${wallet.id}_recurring`]: {
        label: `${wallet.name} - Recurring`,
        color: wallet.color || "hsl(var(--primary))",
      },
      [`${wallet.id}_one_time`]: {
        label: `${wallet.name} - One-Time`,
        color: `${wallet.color}80` || "hsl(var(--primary) / 0.5)",
      },
    }),
    {} as ChartConfig,
  );

  const chartConfig: ChartConfig = config;

  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = visibleWallets.reduce((total, wallet) => {
      const recurring =
        (chartData[chartData.length - 1][
          `${wallet.id}_recurring`
        ] as number) || 0;
      const oneTime =
        (chartData[chartData.length - 1][
          `${wallet.id}_one_time`
        ] as number) || 0;
      return total + recurring + oneTime;
    }, 0);
    const previous = visibleWallets.reduce((total, wallet) => {
      const recurring =
        (chartData[chartData.length - 2][
          `${wallet.id}_recurring`
        ] as number) || 0;
      const oneTime =
        (chartData[chartData.length - 2][
          `${wallet.id}_one_time`
        ] as number) || 0;
      return total + recurring + oneTime;
    }, 0);
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const percentageChange = calculatePercentageChange();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recurring vs One-Time Bills</CardTitle>
          <CardDescription>
            Comparing fixed and variable obligations in {baseCurrency}
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recurring vs One-Time Bills</CardTitle>
          <CardDescription>
            Comparing fixed and variable obligations in {baseCurrency}
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
          <CardTitle>Recurring vs One-Time Bills</CardTitle>
          <CardDescription>
            Comparing fixed and variable obligations in {baseCurrency}
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
        <CardTitle>Recurring vs One-Time Bills</CardTitle>
        <CardDescription>
          Comparing fixed and variable obligations in {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
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
              tickFormatter={(value) => format(new Date(value), "MMM yyyy")}
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
              labelFormatter={(value) => format(new Date(value), "MMMM yyyy")}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                const walletGroups: Record<
                  string,
                  {
                    recurring: number;
                    one_time: number;
                  }
                > = {};

                payload.forEach((item) => {
                  const dataKey = item.dataKey as string;
                  const match = dataKey.match(/^(.+)_(recurring|one_time)$/);
                  if (match) {
                    const [, walletId, type] = match;
                    if (!walletGroups[walletId]) {
                      walletGroups[walletId] = {
                        recurring: 0,
                        one_time: 0,
                      };
                    }
                    walletGroups[walletId][
                      type as keyof (typeof walletGroups)[string]
                    ] = item.value as number;
                  }
                });

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {format(new Date(label), "MMMM yyyy")}
                        </span>
                      </div>
                      <div className="grid gap-2">
                        {Object.entries(walletGroups).map(
                          ([walletId, values]) => {
                            const wallet = walletMap.get(walletId);
                            if (!wallet) return null;
                            return (
                              <div key={walletId} className="grid gap-1">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: wallet.color }}
                                  />
                                  <span className="text-sm font-medium">
                                    {wallet.name}
                                  </span>
                                </div>
                                <div className="ml-4 grid gap-1 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">
                                      Recurring:
                                    </span>
                                    <Money
                                      cents={Math.round(values.recurring * 100)}
                                      currency={baseCurrency}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">
                                      One-Time:
                                    </span>
                                    <Money
                                      cents={Math.round(values.one_time * 100)}
                                      currency={baseCurrency}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {visibleWallets.map((wallet) => (
              <React.Fragment key={wallet.id}>
                <Area
                  dataKey={`${wallet.id}_recurring`}
                  name={`${wallet.name} - Recurring`}
                  type="monotone"
                  fill={chartConfig[`${wallet.id}_recurring`].color}
                  fillOpacity={0.5}
                  stroke={chartConfig[`${wallet.id}_recurring`].color}
                  strokeWidth={2}
                  stackId={`wallet-${wallet.id}`}
                />
                <Area
                  dataKey={`${wallet.id}_one_time`}
                  name={`${wallet.name} - One-Time`}
                  type="monotone"
                  fill={chartConfig[`${wallet.id}_one_time`].color}
                  fillOpacity={0.5}
                  stroke={chartConfig[`${wallet.id}_one_time`].color}
                  strokeWidth={2}
                  stackId={`wallet-${wallet.id}`}
                />
              </React.Fragment>
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
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
