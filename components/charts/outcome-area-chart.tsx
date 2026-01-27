"use client";

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
} from "@/components/ui/chart";
import { Money } from "@/components/ui/money";
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { useCurrency } from "@/contexts/settings-context";
import { parseMonthDate } from "@/utils/chart-helpers";
import { ChartColors } from "@/utils/constants";
import { TransactionList } from "@/utils/supabase/types";

// Helper function for YAxis tick formatting since it can't use React components
function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

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
  const { baseCurrency } = useCurrency();
  const chartData = groupTransactionsByMonth(transactions ?? []);

  const chartConfig: ChartConfig = {
    amount: {
      label: "Outcome",
      color: ChartColors.expense,
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
              tickFormatter={(value) => format(parseMonthDate(value), "MMM yyyy")}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
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
                        <span className="text-sm font-medium">
                          <Money
                            cents={Math.round(
                              (payload[0].value as number) * 100,
                            )}
                            currency={baseCurrency}
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
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
