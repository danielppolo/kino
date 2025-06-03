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
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { Wallet } from "@/utils/supabase/types";

interface MonthlyBalance {
  month: string;
  balance_cents: number;
  wallet_id: string;
}

interface ChartDataPoint {
  month: string;
  [walletId: string]: number | string;
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
  // Group by month and wallet, converting to base currency
  const groupedByMonthAndWallet = monthlyBalances.reduce(
    (acc, { month, balance_cents, wallet_id }) => {
      if (!acc[month]) {
        acc[month] = {};
      }
      const wallet = walletMap.get(wallet_id);
      if (!wallet) return acc;

      const rate =
        wallet.currency === baseCurrency
          ? 1
          : (conversionRates[wallet.currency]?.rate ?? 1);
      const balanceInBaseCurrency = Math.round(balance_cents * rate);
      acc[month][wallet_id] =
        (acc[month][wallet_id] || 0) + balanceInBaseCurrency;
      return acc;
    },
    {} as Record<string, Record<string, number>>,
  );

  // Convert to array and sort by month
  return Object.entries(groupedByMonthAndWallet)
    .map(([month, balances]) => ({
      month,
      ...Object.entries(balances).reduce(
        (acc, [walletId, balance_cents]) => ({
          ...acc,
          [walletId]: balance_cents / 100,
        }),
        {} as Record<string, number>,
      ),
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

  // Get visible wallets and create chart config
  const visibleWallets = useMemo(() => {
    // Get unique wallet IDs from monthlyBalances
    const walletIds = new Set(monthlyBalances.map((b) => b.wallet_id));
    // Filter visible wallets that have data
    return Array.from(walletMap.values()).filter((w) => walletIds.has(w.id));
  }, [walletMap, monthlyBalances]);

  const chartConfig: ChartConfig = useMemo(() => {
    return visibleWallets.reduce(
      (acc, wallet, index) => ({
        ...acc,
        [wallet.id]: {
          label: wallet.name,
          color: wallet.color,
        },
      }),
      {},
    );
  }, [visibleWallets]);

  // Calculate percentage change for the total
  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = visibleWallets.reduce((total, wallet) => {
      const balance = chartData[chartData.length - 1][wallet.id] || 0;
      return total + balance;
    }, 0);
    const previous = visibleWallets.reduce((total, wallet) => {
      const balance = chartData[chartData.length - 2][wallet.id] || 0;
      return total + balance;
    }, 0);
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const percentageChange = calculatePercentageChange();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accumulated Total</CardTitle>
        <CardDescription>
          Showing total balance over time by wallet in {baseCurrency}
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
              bottom: 12,
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

                const total = payload.reduce(
                  (sum, item) => sum + (item.value as number),
                  0,
                );

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {format(new Date(label), "MMMM yyyy")}
                        </span>
                        <span className="text-sm font-medium">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: baseCurrency,
                            minimumFractionDigits: 2,
                          }).format(total)}
                        </span>
                      </div>
                      <div className="grid gap-1">
                        {payload.map((item) => {
                          const wallet = walletMap.get(item.dataKey as string);
                          if (!wallet) return null;
                          return (
                            <div
                              key={wallet.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span className="text-muted-foreground text-sm">
                                  {wallet.name}
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
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {visibleWallets.map((wallet) => (
              <Area
                key={wallet.id}
                dataKey={wallet.id}
                name={wallet.name}
                type="monotone"
                fill={chartConfig[wallet.id].color}
                fillOpacity={0.1}
                stroke={chartConfig[wallet.id].color}
                stackId="a"
              />
            ))}
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
