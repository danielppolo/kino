"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";
import { Bold, Italic, Underline } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

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
import { createClient } from "@/utils/supabase/client";
import { listCategories, listTransactions } from "@/utils/supabase/queries";
import { Category, Transaction } from "@/utils/supabase/types";

export const description = "A stacked area chart with expand stacking";

function groupTransactionsByCategory(
  transactions: Transaction[],
  categories: Category[],
) {
  // Initialize categories for each month only once
  const categoryTemplate = categories.reduce(
    (acc, category) => {
      acc[category.id] = 0;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Use an object to store the results
  const result: Record<string, any> = {};

  transactions.forEach((txn) => {
    const { category_id, amount_cents, date } = txn;

    // Extract the month from the date (ISO string)
    const transactionDate = new Date(date);
    const month = format(transactionDate, "yyyy-MM");

    // Ensure the month exists in the result and clone the category template
    if (!result[month]) {
      result[month] = { month, ...{ ...categoryTemplate } };
    }

    // Sum the amount_cents for each category within the same month (in dollars, absolute value)
    result[month][category_id] += Math.abs(amount_cents / 100);
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

const getChartConfig = (categories: Category[]) => {
  if (!categories) return {};
  return categories.reduce((acc, category, index) => {
    acc[category.id] = {
      label: category.name,
      color: category.color,
    };
    return acc;
  }, {});
};

export function TransactionsAreaChart() {
  const searchParams = useSearchParams();
  const supabase = createClient();
  const params = Object.fromEntries(searchParams.entries());
  const { data: transactions } = useQuery(listTransactions(supabase, params));
  const { data: categories } = useQuery(listCategories(supabase));

  const chartData = useMemo(
    () => groupTransactionsByCategory(transactions ?? [], categories ?? []),
    [transactions, categories],
  );

  const chartConfig: ChartConfig = useMemo(
    () => getChartConfig(categories ?? []),
    [categories],
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
              type="category"
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
            {categories?.map((category) => (
              <Area
                key={category.id}
                dataKey={category.id}
                type="basis"
                fill={category.color}
                fillOpacity={0.1}
                stroke={category.color}
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
