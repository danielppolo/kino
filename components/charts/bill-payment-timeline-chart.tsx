"use client";

import React from "react";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";

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
import { createClient } from "@/utils/supabase/client";
import { getBillPaymentTimeline } from "@/utils/supabase/queries";

interface BillPaymentTimelineChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface ChartDataPoint {
  month: string;
  [key: string]: number | string;
}

export function BillPaymentTimelineChart({
  walletId,
  from,
  to,
}: BillPaymentTimelineChartProps) {
  const {
    data: timelineData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bill-payment-timeline", walletId, from, to],
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

      monthGroups[stat.month][wallet.id] = stat.avg_days_from_due;
    });

    return Object.entries(monthGroups)
      .map(([month, wallets]) => {
        const dataPoint: ChartDataPoint = { month };
        Object.entries(wallets).forEach(([walletId, avgDays]) => {
          dataPoint[walletId] = avgDays;
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
      const days = (chartData[chartData.length - 1][wallet.id] as number) || 0;
      return total + Math.abs(days);
    }, 0);
    const previous = visibleWallets.reduce((total, wallet) => {
      const days = (chartData[chartData.length - 2][wallet.id] as number) || 0;
      return total + Math.abs(days);
    }, 0);
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const percentageChange = calculatePercentageChange();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bill Payment Timeline</CardTitle>
          <CardDescription>
            Average days from due date (negative = early, positive = late)
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
          <CardTitle>Bill Payment Timeline</CardTitle>
          <CardDescription>
            Average days from due date (negative = early, positive = late)
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
          <CardTitle>Bill Payment Timeline</CardTitle>
          <CardDescription>
            Average days from due date (negative = early, positive = late)
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
        <CardTitle>Bill Payment Timeline</CardTitle>
        <CardDescription>
          Average days from due date (negative = early, positive = late)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
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
              label={{ value: "Days", angle: -90, position: "insideLeft" }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) => format(new Date(value), "MMMM yyyy")}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {format(new Date(label), "MMMM yyyy")}
                        </span>
                      </div>
                      <div className="grid gap-1">
                        {payload.map((item) => {
                          const wallet = walletMap.get(item.dataKey as string);
                          if (!wallet) return null;
                          const days = item.value as number;
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
                                {days.toFixed(1)} days {days < 0 ? "early" : days > 0 ? "late" : "on time"}
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
              <Bar
                key={wallet.id}
                dataKey={wallet.id}
                fill={chartConfig[wallet.id].color}
                radius={4}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
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
