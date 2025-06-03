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
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { Wallet } from "@/utils/supabase/types";

interface MonthlyBalance {
  month: string;
  balance_cents: number;
  wallet_id: string;
}

interface ChartDataPoint {
  month: string;
  total: number;
}

interface AccumulatedAreaChartProps {
  monthlyBalances: MonthlyBalance[];
}

function calculateAccumulatedTotal(
  monthlyBalances: MonthlyBalance[],
  conversionRates: Record<string, { rate: number }>,
  baseCurrency: string,
  walletMap: Map<string, Wallet>,
): ChartDataPoint[] {
  // Group by month and convert to base currency
  const groupedByMonth = monthlyBalances.reduce(
    (acc, { month, balance_cents, wallet_id }) => {
      const currency = walletMap.get(wallet_id).currency;
      const rate =
        currency === baseCurrency ? 1 : (conversionRates[currency]?.rate ?? 1);
      const balanceInBaseCurrency = Math.round(balance_cents * rate);
      acc[month] = (acc[month] || 0) + balanceInBaseCurrency;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Convert to array and sort by month
  return Object.entries(groupedByMonth)
    .map(([month, balance_cents]) => ({
      month,
      total: balance_cents / 100,
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
}

export function AccumulatedAreaChart({
  monthlyBalances,
}: AccumulatedAreaChartProps) {
  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  const chartData = useMemo(
    () =>
      calculateAccumulatedTotal(
        monthlyBalances ?? [],
        conversionRates,
        baseCurrency,
        walletMap,
      ),
    [monthlyBalances, conversionRates, baseCurrency, walletMap],
  );

  const chartConfig: ChartConfig = {
    total: {
      label: `Balance (${baseCurrency})`,
      color: "#3b82f6", // Blue color for accumulated total
    },
  };

  // Calculate percentage change
  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1].total;
    const previous = chartData[chartData.length - 2].total;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const percentageChange = calculatePercentageChange();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accumulated Total</CardTitle>
        <CardDescription>
          Showing total balance over time in {baseCurrency}
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
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value, name, item, index, payload) => {
                    return (
                      <div>
                        <div>{payload?.month}</div>
                        <div>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: baseCurrency,
                            minimumFractionDigits: 2,
                            signDisplay: "always",
                          }).format(value as number)}
                        </div>
                      </div>
                    );
                  }}
                />
              }
            />
            <Area
              dataKey="total"
              type="monotone"
              fill="#3b82f6"
              fillOpacity={0.1}
              stroke="#3b82f6"
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
