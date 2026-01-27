"use client";

import React from "react";
import { format } from "date-fns";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { parseMonthDate } from "@/utils/chart-helpers";
import { createClient } from "@/utils/supabase/client";
import { getBillPaymentTimeline } from "@/utils/supabase/queries";

interface BillPaymentRateChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface ChartDataPoint {
  month: string;
  [key: string]: number | string;
}

export function BillPaymentRateChart({
  walletId,
  from,
  to,
}: BillPaymentRateChartProps) {
  const {
    data: timelineData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bill-payment-rate", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getBillPaymentTimeline(supabase, {
        walletId,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const [wallets, walletMap] = useWallets();
  const { baseCurrency } = useCurrency();

  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!timelineData) return [];

    const monthGroups: Record<string, Record<string, number>> = {};

    timelineData.forEach((stat) => {
      if (!monthGroups[stat.month]) {
        monthGroups[stat.month] = {};
      }

      const wallet = walletMap.get(stat.wallet_id);
      if (!wallet) return;

      // Calculate on-time payment rate as percentage
      const onTimeRate = stat.total_count > 0
        ? (stat.on_time_count / stat.total_count) * 100
        : 0;

      monthGroups[stat.month][wallet.id] = onTimeRate;
    });

    return Object.entries(monthGroups)
      .map(([month, wallets]) => {
        const dataPoint: ChartDataPoint = { month };
        Object.entries(wallets).forEach(([walletId, rate]) => {
          dataPoint[walletId] = rate;
        });
        return dataPoint;
      })
      .sort(
        (a, b) =>
          new Date(a.month as string).getTime() -
          new Date(b.month as string).getTime(),
      );
  }, [timelineData, walletMap]);

  let visibleWallets;
  if (walletId) {
    const wallet = walletMap.get(walletId);
    visibleWallets = wallet ? [wallet] : [];
  } else {
    const walletIds = new Set(timelineData?.map((b) => b.wallet_id) ?? []);
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

  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = visibleWallets.reduce((total, wallet) => {
      const rate = (chartData[chartData.length - 1][wallet.id] as number) || 0;
      return total + rate;
    }, 0) / visibleWallets.length;
    const previous = visibleWallets.reduce((total, wallet) => {
      const rate = (chartData[chartData.length - 2][wallet.id] as number) || 0;
      return total + rate;
    }, 0) / visibleWallets.length;
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const percentageChange = calculatePercentageChange();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bill Payment Rate</CardTitle>
          <CardDescription>
            Percentage of bills paid on time each month
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
          <CardTitle>Bill Payment Rate</CardTitle>
          <CardDescription>
            Percentage of bills paid on time each month
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
          <CardTitle>Bill Payment Rate</CardTitle>
          <CardDescription>
            Percentage of bills paid on time each month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No payment data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Payment Rate</CardTitle>
        <CardDescription>
          Percentage of bills paid on time each month
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              tickFormatter={(value) => format(parseMonthDate(value), "MMM yyyy")}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) => format(parseMonthDate(value), "MMMM yyyy")}
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
                          const rate = item.value as number;
                          return (
                            <div key={item.dataKey} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: wallet.color }}
                                />
                                <span className="text-sm">{wallet.name}</span>
                              </div>
                              <span className="text-sm font-medium">
                                {rate.toFixed(1)}% on time
                              </span>
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
