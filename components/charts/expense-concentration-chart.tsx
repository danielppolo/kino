"use client";

import React from "react";
import { Cell, Pie, PieChart } from "recharts";

import { useQuery } from "@tanstack/react-query";

import { ChartSkeleton } from "@/components/charts/shared/chart-skeleton";
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
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { ChartColors } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import { getExpenseConcentration } from "@/utils/supabase/queries";

interface ExpenseConcentrationChartProps {
  walletId?: string;
  from?: string;
  to?: string;
  topN?: number;
}

const COLORS = [
  ChartColors.hsl.green,
  ChartColors.hsl.blue,
  ChartColors.hsl.purple,
  ChartColors.hsl.orange,
  ChartColors.hsl.teal,
  ChartColors.hsl.pink,
  ChartColors.hsl.yellow,
];

export function ExpenseConcentrationChart({
  walletId,
  from,
  to,
  topN = 5,
}: ExpenseConcentrationChartProps) {
  const [wallets] = useWallets();
  const workspaceWalletIds = wallets.map((w) => w.id);
  const { baseCurrency } = useCurrency();

  const {
    data: concentrationData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "expense-concentration",
      walletId,
      workspaceWalletIds,
      from,
      to,
      topN,
    ],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getExpenseConcentration(supabase, {
        walletId,
        workspaceWalletIds,
        from,
        to,
        topN,
      });

      if (error) throw error;
      return data;
    },
  });

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
          <ChartSkeleton variant="bar" />
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
                        <span className="text-sm font-medium">
                          {data.category}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs">
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
            <div
              key={item.category}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-sm font-medium">{item.category}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {item.percentage.toFixed(1)}%
                </span>
                <Money
                  cents={Math.round(item.amount * 100)}
                  currency={baseCurrency}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
