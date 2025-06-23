"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { TransactionList } from "@/utils/supabase/types";

function groupTransactionsByMonth(transactions: TransactionList[]) {
  const result: Record<string, number> = {};

  transactions
    .filter((txn) => txn.type === "expense" && txn.date && txn.amount_cents) // Filter out null values and non-expense transactions
    .forEach((txn) => {
      const { amount_cents, date } = txn;
      const transactionDate = new Date(date!);
      const month = format(transactionDate, "yyyy-MM");

      if (!result[month]) {
        result[month] = 0;
      }

      // Sum the amount_cents for each month (in dollars)
      result[month] += Math.abs(amount_cents! / 100);
    });

  // Convert to array and sort by date
  const sortedResults = Object.entries(result)
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return sortedResults;
}

interface OutcomeAreaChartProps {
  transactions: TransactionList[];
}

export function OutcomeAreaChart({ transactions }: OutcomeAreaChartProps) {
  const chartData = useMemo(
    () => groupTransactionsByMonth(transactions ?? []),
    [transactions],
  );

  const chartConfig: ChartConfig = {
    amount: {
      label: "Outcome",
      color: "#ef4444", // Red color for expenses
    },
  };

  // Calculate percentage change
  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1].amount;
    const previous = chartData[chartData.length - 2].amount;
    return ((current - previous) / previous) * 100;
  };

  const percentageChange = calculatePercentageChange();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outcome History</CardTitle>
        <CardDescription>Showing expense trends over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
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
              tickFormatter={(value) =>
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(value)
              }
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) => format(new Date(value), "MMMM yyyy")}
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value) =>
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 2,
                    }).format(value as number)
                  }
                />
              }
            />
            <Area
              dataKey="amount"
              type="monotone"
              fill="#ef4444"
              fillOpacity={0.1}
              stroke="#ef4444"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <TrendingIndicator
          percentageChange={percentageChange}
          startDate={chartData.length > 0 ? chartData[0].month : undefined}
          endDate={
            chartData.length > 0
              ? chartData[chartData.length - 1].month
              : undefined
          }
        />
      </CardFooter>
    </Card>
  );
}
