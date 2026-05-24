"use client";

import React from "react";
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
import { ChartColors } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import { getAverageMonthlySpendingVsIncome } from "@/utils/supabase/queries";

interface AvgSpendingVsIncomeChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface ChartDataPoint {
  month: string;
  income: number;
  spending: number;
  net: number;
  _original?: {
    income: number;
    spending: number;
    net: number;
  };
}

const chartConfig: ChartConfig = {
  income: {
    label: "Income",
    color: ChartColors.income,
  },
  spending: {
    label: "Spending",
    color: ChartColors.expense,
  },
  net: {
    label: "Cashflow",
    color: ChartColors.balance,
  },
  avgIncome: {
    label: "Avg Income",
    color: ChartColors.income,
  },
  avgSpending: {
    label: "Avg Spending",
    color: ChartColors.expense,
  },
};

export function AvgSpendingVsIncomeChart({
  walletId,
  from,
  to,
}: AvgSpendingVsIncomeChartProps) {
  const [wallets, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  const {
    data: spendingVsIncomeData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "avg-spending-vs-income",
      walletId,
      from,
      to,
      baseCurrency,
      conversionRates,
    ],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getAverageMonthlySpendingVsIncome(
        supabase,
        {
          walletId,
          from,
          to,
        },
        conversionRates,
        baseCurrency,
        walletMap,
      );

      if (error) throw error;
      return data;
    },
  });

  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!spendingVsIncomeData) return [];

    const { monthlyData } = spendingVsIncomeData;

    // Collect all values to calculate percentiles (use absolute values)
    const allValues: number[] = [];
    monthlyData.forEach((month) => {
      allValues.push(Math.abs(month.income));
      allValues.push(Math.abs(month.spending));
    });

    // Calculate 75th percentile to cap outliers (more aggressive for small datasets)
    const sorted = [...allValues].sort((a, b) => a - b);
    const p75Index = Math.floor(sorted.length * 0.99);
    const p75Value = sorted[p75Index] || Infinity;

    // Cap values at 75th percentile to normalize the chart
    const result = monthlyData.map((month) => {
      // Store original uncapped values (as absolute values)
      const originalValues = {
        income: Math.abs(month.income),
        spending: Math.abs(month.spending),
        net: month.net,
      };

      // Cap extreme values to keep chart readable (use absolute values)
      const cappedIncome = Math.min(Math.abs(month.income), p75Value);
      const cappedSpending = Math.min(Math.abs(month.spending), p75Value);

      const dataPoint: ChartDataPoint = {
        month: month.month,
        income: cappedIncome,
        spending: cappedSpending,
        net: month.net,
      };

      // Store originals as hidden property for tooltip access
      (dataPoint as any)._original = originalValues;
      return dataPoint;
    });

    return result;
  }, [spendingVsIncomeData]);

  const statistics = spendingVsIncomeData?.statistics;

  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1].net;
    const previous = chartData[chartData.length - 2].net;
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const percentageChange = calculatePercentageChange();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income, Spending & Cashflow Analysis</CardTitle>
          <CardDescription>
            Monthly income, spending, and net cashflow in {baseCurrency}
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
          <CardTitle>Income, Spending & Cashflow Analysis</CardTitle>
          <CardDescription>
            Monthly income, spending, and net cashflow in {baseCurrency}
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

  if (!chartData || chartData.length === 0 || !statistics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income, Spending & Cashflow Analysis</CardTitle>
          <CardDescription>
            Monthly income, spending, and net cashflow in {baseCurrency}
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

  // Check if we have enough data for meaningful statistics
  if (chartData.length < 4) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income, Spending & Cashflow Analysis</CardTitle>
          <CardDescription>
            Monthly income, spending, and net cashflow in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            Need at least 4 months of data for meaningful statistics
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income, Spending & Cashflow Analysis</CardTitle>
        <CardDescription>
          Monthly income, spending, and net cashflow in {baseCurrency} (outliers
          capped at 99th percentile for clarity)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-2xl font-bold">
              <Money
                cents={Math.round(Math.abs(statistics.avgIncome) * 100)}
                currency={baseCurrency}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Average Monthly Income
            </p>
          </div>
          <div>
            <div className="text-2xl font-bold">
              <Money
                cents={Math.round(Math.abs(statistics.avgSpending) * 100)}
                currency={baseCurrency}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Average Monthly Spending
            </p>
          </div>
          <div>
            <div
              className={`text-2xl font-bold ${
                statistics.avgNet > 0
                  ? "text-green-500"
                  : statistics.avgNet < 0
                    ? "text-red-500"
                    : ""
              }`}
            >
              <Money
                cents={Math.round(statistics.avgNet * 100)}
                currency={baseCurrency}
                showSign
              />
            </div>
            <p className="text-muted-foreground text-sm">Average Monthly Net</p>
          </div>
          <div>
            <div
              className={`text-2xl font-bold ${
                statistics.savingsRate > 0
                  ? "text-green-500"
                  : statistics.savingsRate < 0
                    ? "text-red-500"
                    : ""
              }`}
            >
              {statistics.savingsRate.toFixed(1)}%
            </div>
            <p className="text-muted-foreground text-sm">Savings Rate</p>
          </div>
        </div>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <defs>
              <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-income)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-income)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillSpending" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-spending)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-spending)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-net)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-net)"
                  stopOpacity={0.5}
                />
              </linearGradient>
            </defs>
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
            />
            <ReferenceLine
              y={Math.abs(statistics.avgIncome)}
              stroke={chartConfig.avgIncome.color}
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.5}
            />
            <ReferenceLine
              y={Math.abs(statistics.avgSpending)}
              stroke={chartConfig.avgSpending.color}
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.5}
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) =>
                format(parseMonthDate(value), "MMMM yyyy")
              }
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                const dataPoint = chartData.find((d) => d.month === label);
                const original = dataPoint?._original;

                const income =
                  (payload.find((p) => p.dataKey === "income")
                    ?.value as number) || 0;
                const spending =
                  (payload.find((p) => p.dataKey === "spending")
                    ?.value as number) || 0;

                const originalIncome = original?.income ?? income;
                const originalSpending = original?.spending ?? spending;
                const net = originalIncome - originalSpending;

                const incomeCapped = originalIncome > income;
                const spendingCapped = originalSpending > spending;

                const incomeDeviation =
                  originalIncome - Math.abs(statistics.avgIncome);
                const spendingDeviation =
                  originalSpending - Math.abs(statistics.avgSpending);

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {format(parseMonthDate(label), "MMMM yyyy")}
                        </span>
                      </div>
                      <div className="grid gap-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: chartConfig.income.color,
                              }}
                            />
                            <span className="text-sm">Income</span>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <Money
                              cents={Math.round(originalIncome * 100)}
                              currency={baseCurrency}
                            />
                            {incomeCapped && (
                              <span className="text-muted-foreground text-xs">
                                (chart shows{" "}
                                {formatCurrency(income, baseCurrency)})
                              </span>
                            )}
                            <span
                              className={`text-xs ${
                                incomeDeviation > 0
                                  ? "text-green-500"
                                  : incomeDeviation < 0
                                    ? "text-red-500"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {incomeDeviation > 0 ? "+" : ""}
                              {formatCurrency(incomeDeviation, baseCurrency)} vs
                              avg
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: chartConfig.spending.color,
                              }}
                            />
                            <span className="text-sm">Spending</span>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <Money
                              cents={Math.round(originalSpending * 100)}
                              currency={baseCurrency}
                            />
                            {spendingCapped && (
                              <span className="text-muted-foreground text-xs">
                                (chart shows{" "}
                                {formatCurrency(spending, baseCurrency)})
                              </span>
                            )}
                            <span
                              className={`text-xs ${
                                spendingDeviation < 0
                                  ? "text-green-500"
                                  : spendingDeviation > 0
                                    ? "text-red-500"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {spendingDeviation > 0 ? "+" : ""}
                              {formatCurrency(
                                spendingDeviation,
                                baseCurrency,
                              )}{" "}
                              vs avg
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t pt-1">
                          <span className="text-sm font-medium">Net</span>
                          <Money
                            cents={Math.round(net * 100)}
                            currency={baseCurrency}
                            showSign
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              dataKey="spending"
              type="monotone"
              fill="url(#fillSpending)"
              stroke="var(--color-spending)"
              strokeWidth={1}
            />
            <Area
              dataKey="income"
              type="monotone"
              fill="url(#fillIncome)"
              stroke="var(--color-income)"
              strokeWidth={1}
            />
            {/* <Area
              dataKey="net"
              type="monotone"
              fill="url(#fillNet)"
              stroke="var(--color-net)"
              strokeWidth={1}
            /> */}
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
