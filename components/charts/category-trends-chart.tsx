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
import { getCategoryTrends } from "@/utils/supabase/queries";
import { StackOffsetToggle } from "./shared/stack-offset-toggle";

interface CategoryTrendsChartProps {
  walletId?: string;
  from?: string;
  to?: string;
  type?: "income" | "expense";
}

interface ChartDataPoint {
  month: string;
  [key: string]: number | string;
}

const CATEGORY_COLORS = [
  ChartColors.hsl.green,
  ChartColors.hsl.blue,
  ChartColors.hsl.purple,
  ChartColors.hsl.darkPurple,
  ChartColors.hsl.orange,
  ChartColors.hsl.yellow,
  ChartColors.hsl.teal,
  ChartColors.hsl.cyan,
  ChartColors.hsl.pink,
  ChartColors.hsl.lightYellow,
];

export function CategoryTrendsChart({
  walletId,
  from,
  to,
  type = "expense",
}: CategoryTrendsChartProps) {
  const {
    data: categoryData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["category-trends", walletId, from, to, type],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getCategoryTrends(supabase, {
        walletId,
        from,
        to,
        type,
      });

      if (error) throw error;
      return data;
    },
  });

  const [wallets, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();
  const [stackMode, setStackMode] = React.useState<"percentage" | "absolute">("percentage");

  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!categoryData) return [];

    const monthGroups: Record<string, Record<string, number>> = {};

    categoryData.forEach((stat) => {
      if (!monthGroups[stat.month]) {
        monthGroups[stat.month] = {};
      }

      // Apply currency conversion
      const wallet = walletMap.get(stat.wallet_id);
      if (!wallet) {
        return;
      }

      const rate = conversionRates[wallet.currency]?.rate ?? 1;
      const convertedAmount = (stat.amount_cents * rate) / 100;

      // Aggregate by category (sum if multiple wallets have same category)
      if (!monthGroups[stat.month][stat.category_id]) {
        monthGroups[stat.month][stat.category_id] = 0;
      }
      monthGroups[stat.month][stat.category_id] += convertedAmount;
    });

    // Collect all values to calculate percentiles
    const allValues: number[] = [];
    Object.values(monthGroups).forEach((categories) => {
      Object.values(categories).forEach((amount) => {
        allValues.push(amount);
      });
    });

    // Calculate 95th percentile to cap outliers
    const sorted = [...allValues].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.997);
    const p95Value = sorted[p95Index] || Infinity;

    // Cap values at 95th percentile to normalize the chart
    const result = Object.entries(monthGroups)
      .map(([month, categories]) => {
        const dataPoint: ChartDataPoint = { month };
        const originalValues: Record<string, number> = {}; // Store originals

        Object.entries(categories).forEach(([categoryId, amount]) => {
          // Cap extreme values to keep chart readable
          const cappedAmount = Math.min(amount, p95Value);
          dataPoint[categoryId] = cappedAmount; // Display capped in bars
          originalValues[categoryId] = amount; // Store original
        });

        // Store originals as hidden property for tooltip access
        (dataPoint as any)._original = originalValues;
        return dataPoint;
      })
      .sort(
        (a, b) =>
          new Date(a.month as string).getTime() -
          new Date(b.month as string).getTime(),
      );

    return result;
  }, [categoryData, conversionRates, walletMap]);

  const visibleCategories = React.useMemo(() => {
    if (!categoryData) return [];

    const categoryMap = new Map<
      string,
      { id: string; name: string; total: number }
    >();

    categoryData.forEach((stat) => {
      if (!categoryMap.has(stat.category_id)) {
        categoryMap.set(stat.category_id, {
          id: stat.category_id,
          name: stat.category_name,
          total: 0,
        });
      }
      const cat = categoryMap.get(stat.category_id)!;

      // Apply currency conversion for totals
      const wallet = walletMap.get(stat.wallet_id);
      if (wallet) {
        const rate = conversionRates[wallet.currency]?.rate ?? 1;
        cat.total += stat.amount_cents * rate;
      }
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [categoryData, conversionRates, walletMap]);

  const config = visibleCategories.reduce(
    (acc, category, index) => ({
      ...acc,
      [category.id]: {
        label: category.name,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      },
    }),
    {} as ChartConfig,
  );

  const chartConfig: ChartConfig = config;

  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = visibleCategories.reduce((total, category) => {
      const amount =
        (chartData[chartData.length - 1][category.id] as number) || 0;
      return total + amount;
    }, 0);
    const previous = visibleCategories.reduce((total, category) => {
      const amount =
        (chartData[chartData.length - 2][category.id] as number) || 0;
      return total + amount;
    }, 0);
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const percentageChange = calculatePercentageChange();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Trends</CardTitle>
          <CardDescription>
            {type === "income" ? "Income" : "Expense"} categories over time in{" "}
            {baseCurrency}
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
          <CardTitle>Category Trends</CardTitle>
          <CardDescription>
            {type === "income" ? "Income" : "Expense"} categories over time in{" "}
            {baseCurrency}
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
          <CardTitle>Category Trends</CardTitle>
          <CardDescription>
            {type === "income" ? "Income" : "Expense"} categories over time in{" "}
            {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No category data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex flex-col space-y-1.5">
            <CardTitle>Category Trends</CardTitle>
            <CardDescription>
              Top {type === "income" ? "income" : "expense"} categories over time in{" "}
              {baseCurrency} (extreme outliers normalized)
            </CardDescription>
          </div>
          <StackOffsetToggle value={stackMode} onValueChange={setStackMode} />
        </div>
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
            stackOffset={stackMode === "percentage" ? "expand" : undefined}
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
              tickFormatter={(value) =>
                stackMode === "percentage"
                  ? `${(value * 100).toFixed(0)}%`
                  : formatCurrency(value, baseCurrency)
              }
              domain={[0, "auto"]}
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) => format(parseMonthDate(value), "MMMM yyyy")}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                // Get original uncapped values from the data point
                const dataPoint = chartData.find((d) => d.month === label);
                const originalValues = (dataPoint as any)?._original || {};

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
                          const category = visibleCategories.find(
                            (c) => c.id === item.dataKey,
                          );
                          if (!category) return null;

                          // Get original value, fallback to capped if not found
                          const originalAmount =
                            originalValues[item.dataKey as string] ??
                            item.value;
                          const displayedAmount = item.value as number;
                          const isCapped = originalAmount > displayedAmount;

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
                                <span className="text-sm">{category.name}</span>
                              </div>
                              <div className="flex flex-col items-end gap-0.5">
                                {/* Show original uncapped value */}
                                <Money
                                  cents={Math.round(originalAmount * 100)}
                                  currency={baseCurrency}
                                />
                                {/* Show capped note if value was normalized */}
                                {isCapped && (
                                  <span className="text-muted-foreground text-xs">
                                    (chart shows{" "}
                                    {formatCurrency(
                                      displayedAmount,
                                      baseCurrency,
                                    )}
                                    )
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {visibleCategories.map((category) => (
              <Bar
                key={category.id}
                dataKey={category.id}
                name={category.name}
                fill={chartConfig[category.id].color}
                stackId="categories"
                radius={[0, 0, 0, 0]}
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
