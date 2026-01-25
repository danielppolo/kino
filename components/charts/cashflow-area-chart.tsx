"use client";

import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import { useCurrency } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyStats } from "@/utils/supabase/queries";

interface MonthlyStats {
  month: string;
  income_cents: number;
  outcome_cents: number;
  net_cents: number;
}

interface CashflowAreaChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

// Helper function for YAxis tick formatting since it can't use React components
function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Utility function to aggregate stats by month
function aggregateMonthlyStats(stats: MonthlyStats[]) {
  const map = new Map<
    string,
    { income_cents: number; outcome_cents: number; net_cents: number }
  >();
  for (const stat of stats) {
    if (!map.has(stat.month)) {
      map.set(stat.month, { income_cents: 0, outcome_cents: 0, net_cents: 0 });
    }
    const agg = map.get(stat.month)!;
    agg.income_cents += stat.income_cents;
    agg.outcome_cents += stat.outcome_cents;
    agg.net_cents += stat.net_cents;
  }
  return Array.from(map.entries()).map(([month, values]) => ({
    month,
    ...values,
  }));
}

export function CashflowAreaChart({
  walletId,
  from,
  to,
}: CashflowAreaChartProps) {
  const {
    data: monthlyStats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["cashflow-area-chart", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyStats(supabase, {
        walletId,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const { baseCurrency } = useCurrency();

  // Aggregate by month
  const aggregatedStats = aggregateMonthlyStats(monthlyStats ?? []);

  const chartData = aggregatedStats.map((stat) => ({
    month: stat.month,
    income: stat.income_cents / 100,
    outcome: -stat.outcome_cents / 100,
    net: stat.net_cents / 100,
  }));

  const chartConfig: ChartConfig = {
    income: {
      label: "Income",
      color: "#22c55e", // Green color for income
    },
    outcome: {
      label: "Outcome",
      color: "#ef4444", // Red color for expenses
    },
    net: {
      label: "Cashflow",
      color: "#000", // Blue color for net
    },
  };

  // Calculate percentage change for net cashflow
  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1].net;
    const previous = chartData[chartData.length - 2].net;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const percentageChange = calculatePercentageChange();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cashflow Analysis</CardTitle>
          <CardDescription>
            Showing income, outcome, and net cashflow over time
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
          <CardTitle>Cashflow Analysis</CardTitle>
          <CardDescription>
            Showing income, outcome, and net cashflow over time
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
          <CardTitle>Cashflow Analysis</CardTitle>
          <CardDescription>
            Showing income, outcome, and net cashflow over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cashflow Analysis</CardTitle>
        <CardDescription>
          Showing income, outcome, and net cashflow over time
        </CardDescription>
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
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) => format(new Date(value), "MMMM yyyy")}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {format(new Date(label), "MMMM yyyy")}
                        </span>
                      </div>
                      <div className="grid gap-1">
                        {payload
                          .filter((item) => !!item.value)
                          .sort((a, b) =>
                            String(b.payload.label).localeCompare(
                              String(a.payload.label),
                            ),
                          )
                          .map((item) => (
                            <div
                              key={item.dataKey}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-muted-foreground text-sm">
                                  {
                                    chartConfig[
                                      item.dataKey as keyof ChartConfig
                                    ]?.label
                                  }
                                </span>
                              </div>
                              <span className="text-muted-foreground text-sm">
                                <Money
                                  cents={Math.round(
                                    (item.value as number) * 100,
                                  )}
                                  currency={baseCurrency}
                                />
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="income"
              fill="#22c55e"
              stroke="#22c55e"
              fillOpacity={0.1}
              dot={false}
              name="Income"
            />
            <Area
              type="monotone"
              dataKey="outcome"
              fill="#ef4444"
              stroke="#ef4444"
              fillOpacity={0.1}
              dot={false}
              name="Outcome"
            />
            <Area
              type="monotone"
              dataKey="net"
              fill="#000"
              stroke="#000"
              fillOpacity={0.5}
              dot={false}
              name="Cashflow"
            />
            <ChartLegend content={<ChartLegendContent />} />
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
