"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  ChartTooltip,
} from "@/components/ui/chart";
import { Money } from "@/components/ui/money";
import { useCurrency } from "@/contexts/settings-context";
import { formatCurrency } from "@/utils/chart-helpers";
import { ChartColors } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import { getTransactionSizeDistribution } from "@/utils/supabase/queries";

interface TransactionSizeDistributionChartProps {
  walletId?: string;
  from?: string;
  to?: string;
  type?: "income" | "expense";
}

export function TransactionSizeDistributionChart({
  walletId,
  from,
  to,
  type,
}: TransactionSizeDistributionChartProps) {
  const {
    data: sizeData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transaction-size-distribution", walletId, from, to, type],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getTransactionSizeDistribution(supabase, {
        walletId,
        from,
        to,
        type,
      });

      if (error) throw error;
      return data;
    },
  });

  const { baseCurrency } = useCurrency();

  const chartData = React.useMemo(() => {
    if (!sizeData) return [];

    return sizeData.map((data) => ({
      range: data.range,
      count: data.count,
      amount: data.total_amount_cents / 100,
    }));
  }, [sizeData]);

  const chartConfig: ChartConfig = {
    count: {
      label: "Transaction Count",
      color: ChartColors.hsl.blue,
    },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction Size Distribution</CardTitle>
          <CardDescription>
            Distribution of transaction amounts in {baseCurrency}
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
          <CardTitle>Transaction Size Distribution</CardTitle>
          <CardDescription>
            Distribution of transaction amounts in {baseCurrency}
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
          <CardTitle>Transaction Size Distribution</CardTitle>
          <CardDescription>
            Distribution of transaction amounts in {baseCurrency}
          </CardDescription>
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
        <CardTitle>Transaction Size Distribution</CardTitle>
        <CardDescription>
          Distribution of transaction amounts in {baseCurrency}
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
              dataKey="range"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              label={{ value: "Count", angle: -90, position: "insideLeft" }}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const data = payload[0].payload;

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{data.range}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div>Count: {data.count}</div>
                        <div className="flex items-center gap-2">
                          <span>Total:</span>
                          <Money
                            cents={Math.round(data.amount * 100)}
                            currency={baseCurrency}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="count"
              fill={chartConfig.count.color}
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
