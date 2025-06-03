"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
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
import { TransactionList } from "@/utils/supabase/types";

function groupTransactionsByMonth(transactions: TransactionList[]) {
  const result: Record<string, number> = {};

  transactions
    .filter((txn) => txn.type === "income" && txn.date && txn.amount_cents) // Filter out null values and non-income transactions
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

interface IncomeAreaChartProps {
  transactions: TransactionList[];
}

export function IncomeAreaChart({ transactions }: IncomeAreaChartProps) {
  const chartData = useMemo(
    () => groupTransactionsByMonth(transactions ?? []),
    [transactions],
  );

  const chartConfig: ChartConfig = {
    amount: {
      label: "Income",
      color: "#22c55e", // Green color for income
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
        <CardTitle>Income History</CardTitle>
        <CardDescription>Showing income trends over time</CardDescription>
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
              fill="#22c55e"
              fillOpacity={0.1}
              stroke="#22c55e"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {percentageChange > 0 ? "Trending up" : "Trending down"} by{" "}
              {Math.abs(percentageChange).toFixed(1)}% this month{" "}
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              {chartData.length > 0 && (
                <>
                  {format(new Date(chartData[0].month), "MMMM yyyy")} -{" "}
                  {format(
                    new Date(chartData[chartData.length - 1].month),
                    "MMMM yyyy",
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
