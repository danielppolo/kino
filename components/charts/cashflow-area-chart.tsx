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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import { useCurrency } from "@/contexts/settings-context";

interface MonthlyStats {
  month: string;
  income_cents: number;
  outcome_cents: number;
  net_cents: number;
}

interface CashflowAreaChartProps {
  monthlyStats: MonthlyStats[];
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

export function CashflowAreaChart({ monthlyStats }: CashflowAreaChartProps) {
  const { baseCurrency } = useCurrency();

  // Aggregate by month
  const aggregatedStats = useMemo(
    () => aggregateMonthlyStats(monthlyStats),
    [monthlyStats],
  );

  const chartData = useMemo(
    () =>
      aggregatedStats.map((stat) => ({
        month: stat.month,
        income: stat.income_cents / 100,
        outcome: -stat.outcome_cents / 100,
        net: stat.net_cents / 100,
      })),
    [aggregatedStats],
  );

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
              tickFormatter={(value) =>
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: baseCurrency,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(value)
              }
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
                                {new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: baseCurrency,
                                  minimumFractionDigits: 2,
                                }).format(item.value as number)}
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
