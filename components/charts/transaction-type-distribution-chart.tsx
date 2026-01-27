"use client";

import React from "react";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import { formatCurrency, parseMonthDate } from "@/utils/chart-helpers";
import { ChartColors } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import { getTransactionTypeDistribution } from "@/utils/supabase/queries";

interface TransactionTypeDistributionChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface ChartDataPoint {
  month: string;
  [key: string]: number | string;
}

export function TransactionTypeDistributionChart({
  walletId,
  from,
  to,
}: TransactionTypeDistributionChartProps) {
  const {
    data: typeData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transaction-type-distribution", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getTransactionTypeDistribution(supabase, {
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
    if (!typeData) return [];

    const monthGroups: Record<
      string,
      {
        income: number;
        expense: number;
        transfer: number;
      }
    > = {};

    typeData.forEach((stat) => {
      const wallet = walletMap.get(stat.wallet_id);
      if (!wallet || !wallet.visible) return;

      if (!monthGroups[stat.month]) {
        monthGroups[stat.month] = {
          income: 0,
          expense: 0,
          transfer: 0,
        };
      }

      const rate = conversionRates[wallet.currency]?.rate ?? 1;

      monthGroups[stat.month].income += (stat.income_cents * rate) / 100;
      monthGroups[stat.month].expense += (stat.expense_cents * rate) / 100;
      monthGroups[stat.month].transfer += (stat.transfer_cents * rate) / 100;
    });

    return Object.entries(monthGroups)
      .map(([month, values]) => ({
        month,
        income: values.income,
        expense: values.expense,
        transfer: values.transfer,
      }))
      .sort(
        (a, b) =>
          new Date(a.month as string).getTime() -
          new Date(b.month as string).getTime(),
      );
  }, [typeData, conversionRates, walletMap]);

  const chartConfig: ChartConfig = {
    income: {
      label: "Income",
      color: ChartColors.hsl.green,
    },
    expense: {
      label: "Expense",
      color: ChartColors.hsl.red,
    },
    transfer: {
      label: "Transfer",
      color: ChartColors.hsl.blue,
    },
  };

  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current =
      (chartData[chartData.length - 1].income as number) +
      (chartData[chartData.length - 1].expense as number) +
      (chartData[chartData.length - 1].transfer as number);
    const previous =
      (chartData[chartData.length - 2].income as number) +
      (chartData[chartData.length - 2].expense as number) +
      (chartData[chartData.length - 2].transfer as number);
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const percentageChange = calculatePercentageChange();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction Type Distribution</CardTitle>
          <CardDescription>
            Income, expense, and transfer breakdown over time in {baseCurrency}
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
          <CardTitle>Transaction Type Distribution</CardTitle>
          <CardDescription>
            Income, expense, and transfer breakdown over time in {baseCurrency}
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
          <CardTitle>Transaction Type Distribution</CardTitle>
          <CardDescription>
            Income, expense, and transfer breakdown over time in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No transaction data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Type Distribution</CardTitle>
        <CardDescription>
          Income, expense, and transfer breakdown over time in {baseCurrency}
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
              tickFormatter={(value) => format(parseMonthDate(value), "MMM yyyy")}
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
                          return (
                            <div
                              key={item.dataKey}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-sm">{item.name}</span>
                              </div>
                              <Money
                                cents={Math.round((item.value as number) * 100)}
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
            <Bar
              dataKey="income"
              name="Income"
              fill={chartConfig.income.color}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="expense"
              name="Expense"
              fill={chartConfig.expense.color}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="transfer"
              name="Transfer"
              fill={chartConfig.transfer.color}
              radius={[4, 4, 0, 0]}
            />
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
