"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Label, Transaction } from "@/utils/supabase/types";

export const description = "A stacked area chart with expand stacking";

function groupTransactionsByLabel(
  transactions: Transaction[],
  labels: Label[],
) {
  // Initialize labels for each month only once
  const labelTemplate = labels.reduce(
    (acc, label) => {
      acc[label.id] = 0;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Use an object to store the results
  const result: Record<string, any> = {};

  transactions.forEach((txn) => {
    const { label_id, amount_cents, date } = txn;

    // Extract the month from the date (ISO string)
    const transactionDate = new Date(date);
    const month = format(transactionDate, "yyyy-MM");

    // Ensure the month exists in the result and clone the label template
    if (!result[month]) {
      result[month] = { month, ...{ ...labelTemplate } };
    }

    // Sum the amount_cents for each label within the same month (in dollars, absolute value)
    result[month][label_id] += Math.abs(amount_cents / 100);
  });

  // Sorting the results: first by current month closest to the last element
  const sortedResults = Object.values(result).sort((a, b) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth(); // 0 (Jan) - 11 (Dec)

    const monthOrder = (month: string) => {
      const [year, monthStr] = month.split("-");
      const date = new Date(parseInt(year), parseInt(monthStr) - 1);
      const yearDiff = date.getFullYear() - currentYear;
      const monthDiff = date.getMonth() - currentMonthIndex;
      return yearDiff * 12 + monthDiff;
    };

    return monthOrder(a.month) - monthOrder(b.month);
  });

  return sortedResults;
}

const getChartConfig = (labels: Label[]) => {
  if (!labels) return {};
  return labels.reduce((acc, label, index) => {
    acc[label.id] = {
      label: label.name,
      color: label.color,
    };
    return acc;
  }, {});
};

interface TransactionsAreaChartProps {
  transactions: Transaction[];
  labels: Label[];
}

export function TransactionsAreaChart({
  transactions,
  labels,
}: TransactionsAreaChartProps) {
  const chartData = useMemo(
    () => groupTransactionsByLabel(transactions ?? [], labels ?? []),
    [transactions, labels],
  );

  const chartConfig: ChartConfig = useMemo(
    () => getChartConfig(labels ?? []),
    [labels],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Area Chart - Stacked Expanded</CardTitle>
        <CardDescription>
          Showing total visitors for the last 6months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
            }}
            stackOffset="expand"
          >
            <CartesianGrid vertical={false} />
            {/* <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => format(new Date(value), "MMMM")}
              type="label"
            /> */}
            {/* <YAxis
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
            /> */}
            {/* <ChartTooltip
              cursor={false}
              labelFormatter={(value) => value.split("-")[1]}
              content={
                <ChartTooltipContent
                  indicator="line"
                  // formatter={(value) => `$${value}`}
                />
              }
            /> */}
            {labels?.map((label) => (
              <Area
                key={label.id}
                dataKey={label.id}
                type="basis"
                fill={label.color}
                fillOpacity={0.1}
                stroke={label.color}
                stackId="a"
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              January - June 2024
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
