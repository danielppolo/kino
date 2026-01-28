"use client";

import React from "react";
import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
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
  ChartTooltip,
} from "@/components/ui/chart";
import { Money } from "@/components/ui/money";
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { formatCurrency, parseMonthDate } from "@/utils/chart-helpers";
import { ChartColors } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import { getWalletNetBalance } from "@/utils/supabase/queries";

interface WalletNetBalanceLineChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface ChartDataPoint {
  month: string;
  net_balance: number;
  bills_due: number;
  payments_made: number;
}

const chartConfig: ChartConfig = {
  net_balance: {
    label: "Net Balance",
    color: ChartColors.balance,
  },
};

export function WalletNetBalanceLineChart({
  walletId,
  from,
  to,
}: WalletNetBalanceLineChartProps) {
  const {
    data: netBalanceData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["wallet-net-balance", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getWalletNetBalance(supabase, {
        walletId,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!netBalanceData || netBalanceData.length === 0) return [];

    // Group by month and convert to base currency
    const monthGroups: Record<
      string,
      { balance: number; bills: number; payments: number }
    > = {};

    netBalanceData.forEach((stat) => {
      const wallet = walletMap.get(stat.wallet_id);
      if (!wallet) return;

      const rate = conversionRates[wallet.currency]?.rate ?? 1;

      if (!monthGroups[stat.month]) {
        monthGroups[stat.month] = { balance: 0, bills: 0, payments: 0 };
      }

      monthGroups[stat.month].balance += (stat.net_balance_cents * rate) / 100;
      monthGroups[stat.month].bills += (stat.bills_due_cents * rate) / 100;
      monthGroups[stat.month].payments +=
        (stat.payments_made_cents * rate) / 100;
    });

    // Convert to array and sort by month
    return Object.entries(monthGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({
        month,
        net_balance: values.balance,
        bills_due: values.bills,
        payments_made: values.payments,
      }));
  }, [netBalanceData, conversionRates, walletMap]);

  // Calculate current net balance
  const currentNetBalance = React.useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData[chartData.length - 1].net_balance;
  }, [chartData]);

  // Calculate last month's change
  const lastMonthChange = React.useMemo(() => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1].net_balance;
    const previous = chartData[chartData.length - 2].net_balance;
    return current - previous;
  }, [chartData]);

  // Calculate percentage change for footer
  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1].net_balance;
    const previous = chartData[chartData.length - 2].net_balance;
    if (previous === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const percentageChange = calculatePercentageChange();

  // Determine line color based on balance
  const lineColor =
    currentNetBalance > 0
      ? ChartColors.income
      : currentNetBalance < 0
        ? ChartColors.expense
        : ChartColors.balance;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bill Payment Net Balance</CardTitle>
          <CardDescription>
            Running balance of bill payments vs. bills due in {baseCurrency}
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
          <CardTitle>Bill Payment Net Balance</CardTitle>
          <CardDescription>
            Running balance of bill payments vs. bills due in {baseCurrency}
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
          <CardTitle>Bill Payment Net Balance</CardTitle>
          <CardDescription>
            Running balance of bill payments vs. bills due in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No bill payment data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Payment Net Balance</CardTitle>
        <CardDescription>
          Running balance of bill payments vs. bills due in {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div>
            <div
              className={`text-3xl font-bold ${
                currentNetBalance > 0
                  ? "text-green-500"
                  : currentNetBalance < 0
                    ? "text-red-500"
                    : ""
              }`}
            >
              <Money
                cents={Math.round(currentNetBalance * 100)}
                currency={baseCurrency}
                showSign
              />
            </div>
            <p className="text-muted-foreground text-sm">Current net balance</p>
          </div>
          <div>
            <div
              className={`text-3xl font-bold ${
                lastMonthChange > 0
                  ? "text-green-500"
                  : lastMonthChange < 0
                    ? "text-red-500"
                    : ""
              }`}
            >
              <Money
                cents={Math.round(lastMonthChange * 100)}
                currency={baseCurrency}
                showSign
              />
            </div>
            <p className="text-muted-foreground text-sm">Last month's change</p>
          </div>
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
            />
            <ReferenceLine
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) =>
                format(parseMonthDate(value), "MMMM yyyy")
              }
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                const dataPoint = payload[0].payload as ChartDataPoint;

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
                          <span className="text-sm">Bills Due</span>
                          <Money
                            cents={Math.round(dataPoint.bills_due * 100)}
                            currency={baseCurrency}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm">Payments Made</span>
                          <Money
                            cents={Math.round(dataPoint.payments_made * 100)}
                            currency={baseCurrency}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t pt-1">
                          <span className="text-sm font-medium">
                            Monthly Net
                          </span>
                          <Money
                            cents={Math.round(
                              (dataPoint.payments_made - dataPoint.bills_due) *
                                100,
                            )}
                            currency={baseCurrency}
                            showSign
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: lineColor,
                              }}
                            />
                            <span className="text-sm font-medium">
                              Running Balance
                            </span>
                          </div>
                          <Money
                            cents={Math.round(dataPoint.net_balance * 100)}
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
            <Line
              dataKey="net_balance"
              type="step"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
            />
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
