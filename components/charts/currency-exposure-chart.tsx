"use client";

import React from "react";
import { Cell, Pie, PieChart } from "recharts";

import { useQuery } from "@tanstack/react-query";

import { ChartSkeleton } from "@/components/charts/shared/chart-skeleton";
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
  ChartTooltip,
} from "@/components/ui/chart";
import { Money } from "@/components/ui/money";
import { ChartColors } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import { getCurrencyExposure } from "@/utils/supabase/queries";

interface CurrencyExposureChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const CURRENCY_COLORS = [
  ChartColors.hsl.green,
  ChartColors.hsl.blue,
  ChartColors.hsl.purple,
  ChartColors.hsl.orange,
  ChartColors.hsl.teal,
  ChartColors.hsl.pink,
];

export function CurrencyExposureChart({
  walletId,
  from,
  to,
}: CurrencyExposureChartProps) {
  const {
    data: currencyData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["currency-exposure", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getCurrencyExposure(supabase, {
        walletId,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const chartData = React.useMemo(() => {
    if (!currencyData) return [];

    return currencyData.map((data, index) => ({
      currency: data.currency,
      amount: data.total_amount_cents / 100,
      count: data.transaction_count,
      fill: CURRENCY_COLORS[index % CURRENCY_COLORS.length],
    }));
  }, [currencyData]);

  const config = chartData.reduce(
    (acc, item) => ({
      ...acc,
      [item.currency]: {
        label: item.currency,
        color: item.fill,
      },
    }),
    {} as ChartConfig,
  );

  const chartConfig: ChartConfig = config;

  const totalAmount = React.useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.amount, 0);
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Currency Exposure</CardTitle>
          <CardDescription>Transaction volume by currency</CardDescription>
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
          <CardTitle>Currency Exposure</CardTitle>
          <CardDescription>Transaction volume by currency</CardDescription>
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
          <CardTitle>Currency Exposure</CardTitle>
          <CardDescription>Transaction volume by currency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No transaction data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Exposure</CardTitle>
        <CardDescription>Transaction volume by currency</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <PieChart>
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const data = payload[0].payload;
                const percentage = ((data.amount / totalAmount) * 100).toFixed(
                  1,
                );

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: data.fill }}
                        />
                        <span className="text-sm font-medium">
                          {data.currency}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        <div>Amount: {data.amount.toFixed(2)}</div>
                        <div>Transactions: {data.count}</div>
                        <div>Percentage: {percentage}%</div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="currency"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 grid gap-2">
          {chartData.map((item) => {
            const percentage = ((item.amount / totalAmount) * 100).toFixed(1);
            return (
              <div
                key={item.currency}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-sm font-medium">{item.currency}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{percentage}%</span>
                  <span className="font-medium">{item.amount.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
