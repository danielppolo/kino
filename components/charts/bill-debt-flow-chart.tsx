"use client";

import React from "react";
import { format } from "date-fns";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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
import { getBillDebtFlow } from "@/utils/supabase/queries";

interface BillDebtFlowChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface ChartDataPoint {
  month: string;
  debt_increase: number;
  debt_decrease: number;
  running_total: number;
}

const chartConfig: ChartConfig = {
  debt_increase: {
    label: "Debt Added",
    color: ChartColors.expense,
  },
  debt_decrease: {
    label: "Debt Paid",
    color: ChartColors.income,
  },
  running_total: {
    label: "Total Outstanding",
    color: ChartColors.balance,
  },
};

export function BillDebtFlowChart({
  walletId,
  from,
  to,
}: BillDebtFlowChartProps) {
  const {
    data: debtFlowData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bill-debt-flow", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getBillDebtFlow(supabase, {
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
    if (!debtFlowData || debtFlowData.length === 0) return [];

    // Group by month and convert to base currency
    const monthGroups: Record<string, { increase: number; decrease: number }> =
      {};

    debtFlowData.forEach((stat) => {
      const wallet = walletMap.get(stat.wallet_id);
      if (!wallet) return;

      const rate = conversionRates[wallet.currency]?.rate ?? 1;

      if (!monthGroups[stat.month]) {
        monthGroups[stat.month] = { increase: 0, decrease: 0 };
      }

      monthGroups[stat.month].increase +=
        (stat.debt_increase_cents * rate) / 100;
      monthGroups[stat.month].decrease +=
        (stat.debt_decrease_cents * rate) / 100;
    });

    // Convert to array and calculate running total
    let runningTotal = 0;
    return Object.entries(monthGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => {
        runningTotal += values.increase - values.decrease;
        return {
          month,
          debt_increase: values.increase,
          debt_decrease: -values.decrease, // Negative for downward bars
          running_total: runningTotal,
        };
      });
  }, [debtFlowData, conversionRates, walletMap]);

  // Calculate current outstanding debt
  const currentOutstanding = React.useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData[chartData.length - 1].running_total;
  }, [chartData]);

  // Calculate last month's net change
  const lastMonthChange = React.useMemo(() => {
    if (chartData.length === 0) return 0;
    const lastMonth = chartData[chartData.length - 1];
    return lastMonth.debt_increase + lastMonth.debt_decrease; // debt_decrease is already negative
  }, [chartData]);

  // Calculate percentage change for footer
  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1].running_total;
    const previous = chartData[chartData.length - 2].running_total;
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const percentageChange = calculatePercentageChange();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bill Debt Flow</CardTitle>
          <CardDescription>
            Monthly debt increases and decreases in {baseCurrency}
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
          <CardTitle>Bill Debt Flow</CardTitle>
          <CardDescription>
            Monthly debt increases and decreases in {baseCurrency}
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
          <CardTitle>Bill Debt Flow</CardTitle>
          <CardDescription>
            Monthly debt increases and decreases in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No debt flow data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Debt Flow</CardTitle>
        <CardDescription>
          Monthly debt increases and decreases in {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-3xl font-bold">
              <Money
                cents={Math.round(currentOutstanding * 100)}
                currency={baseCurrency}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Current outstanding debt
            </p>
          </div>
          <div>
            <div
              className={`text-3xl font-bold ${
                lastMonthChange > 0
                  ? "text-red-500"
                  : lastMonthChange < 0
                    ? "text-green-500"
                    : ""
              }`}
            >
              <Money
                cents={Math.round(lastMonthChange * 100)}
                currency={baseCurrency}
                showSign
              />
            </div>
            <p className="text-muted-foreground text-sm">
              Last month's net change
            </p>
          </div>
        </div>
        <ChartContainer config={chartConfig}>
          <ComposedChart
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
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
            />
            <ReferenceLine
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              yAxisId="left"
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) => format(parseMonthDate(value), "MMMM yyyy")}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                const increase =
                  (payload.find((p) => p.dataKey === "debt_increase")
                    ?.value as number) || 0;
                const decrease =
                  (payload.find((p) => p.dataKey === "debt_decrease")
                    ?.value as number) || 0;
                const runningTotal =
                  (payload.find((p) => p.dataKey === "running_total")
                    ?.value as number) || 0;
                const netChange = increase + decrease; // decrease is already negative

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
                                backgroundColor:
                                  chartConfig.debt_increase.color,
                              }}
                            />
                            <span className="text-sm">Debt Added</span>
                          </div>
                          <Money
                            cents={Math.round(increase * 100)}
                            currency={baseCurrency}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor:
                                  chartConfig.debt_decrease.color,
                              }}
                            />
                            <span className="text-sm">Debt Paid</span>
                          </div>
                          <Money
                            cents={Math.round(Math.abs(decrease) * 100)}
                            currency={baseCurrency}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t pt-1">
                          <span className="text-sm font-medium">
                            Net Change
                          </span>
                          <Money
                            cents={Math.round(netChange * 100)}
                            currency={baseCurrency}
                            showSign
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor:
                                  chartConfig.running_total.color,
                              }}
                            />
                            <span className="text-sm">Total Outstanding</span>
                          </div>
                          <Money
                            cents={Math.round(runningTotal * 100)}
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
              yAxisId="left"
              dataKey="debt_increase"
              fill={chartConfig.debt_increase.color}
              radius={4}
            />
            <Bar
              yAxisId="left"
              dataKey="debt_decrease"
              fill={chartConfig.debt_decrease.color}
              radius={4}
            />
            <Line
              yAxisId="right"
              dataKey="running_total"
              type="monotone"
              stroke={chartConfig.running_total.color}
              strokeWidth={2}
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
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
