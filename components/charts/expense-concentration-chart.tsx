"use client";

import React from "react";
import { Cell, Pie, PieChart } from "recharts";

import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { Money } from "@/components/ui/money";
import { useCurrency } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getExpenseConcentration } from "@/utils/supabase/queries";

interface ExpenseConcentrationChartProps {
  walletId?: string;
  from?: string;
  to?: string;
  topN?: number;
}

const COLORS = [
  "hsl(142, 76%, 36%)",
  "hsl(221, 83%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(24, 70%, 50%)",
  "hsl(168, 76%, 42%)",
  "hsl(339, 82%, 52%)",
  "hsl(43, 89%, 38%)",
];

export function ExpenseConcentrationChart({
  walletId,
  from,
  to,
  topN = 5,
}: ExpenseConcentrationChartProps) {
  const {
    data: concentrationData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["expense-concentration", walletId, from, to, topN],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getExpenseConcentration(supabase, {
        walletId,
        from,
        to,
        topN,
      });

      if (error) throw error;
      return data;
    },
  });

  const { baseCurrency } = useCurrency();

  const chartData = React.useMemo(() => {
    if (!concentrationData) return [];

    return concentrationData.map((data, index) => ({
      category: data.category_name,
      amount: data.total_cents / 100,
      percentage: data.percentage,
      fill: COLORS[index % COLORS.length],
    }));
  }, [concentrationData]);

  const config = chartData.reduce(
    (acc, item) => ({
      ...acc,
      [item.category]: {
        label: item.category,
        color: item.fill,
      },
    }),
    {} as ChartConfig,
  );

  const chartConfig: ChartConfig = config;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Concentration</CardTitle>
          <CardDescription>
            Top expense categories as percentage of total in {baseCurrency}
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
          <CardTitle>Expense Concentration</CardTitle>
          <CardDescription>
            Top expense categories as percentage of total in {baseCurrency}
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
          <CardTitle>Expense Concentration</CardTitle>
          <CardDescription>
            Top expense categories as percentage of total in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No expense data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Concentration</CardTitle>
        <CardDescription>
          Top {topN} expense categories as percentage of total in {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <PieChart>
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const data = payload[0].payload;

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: data.fill }}
                        />
                        <span className="text-sm font-medium">{data.category}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>Amount:</span>
                          <Money
                            cents={Math.round(data.amount * 100)}
                            currency={baseCurrency}
                          />
                        </div>
                        <div>Percentage: {data.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-4 grid gap-2">
          {chartData.map((item) => (
            <div key={item.category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-sm font-medium">{item.category}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                <Money cents={Math.round(item.amount * 100)} currency={baseCurrency} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
