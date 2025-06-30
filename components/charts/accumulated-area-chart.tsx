"use client";

import { useMemo } from "react";
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
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getWalletMonthlyBalances } from "@/utils/supabase/queries";
import { Wallet } from "@/utils/supabase/types";

// Helper function for YAxis tick formatting since it can't use React components
function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

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
  walletId?: string;
  from?: string;
  to?: string;
}

function calculateAccumulatedTotal(
  monthlyBalances: MonthlyBalance[],
  conversionRates: Record<string, { rate: number }>,
  baseCurrency: string,
  walletMap: Map<string, Wallet>,
  walletId?: string,
): ChartDataPoint[] {
  console.log(monthlyBalances);
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
  const chartData: ChartDataPoint[] = Object.entries(groupedByMonthAndWallet)
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

  // If filtering by a specific wallet, ensure all data points have that wallet's data
  if (walletId) {
    return chartData.map((dataPoint) => ({
      ...dataPoint,
      [walletId]: dataPoint[walletId] || 0,
    }));
  }

  return chartData;
}

export function AccumulatedAreaChart({
  walletId,
  from,
  to,
}: AccumulatedAreaChartProps) {
  const {
    data: monthlyBalances,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["accumulated-area-chart", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getWalletMonthlyBalances(supabase, {
        walletId,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  const chartData = useMemo(
    () =>
      calculateAccumulatedTotal(
        monthlyBalances ?? [],
        conversionRates,
        baseCurrency,
        walletMap,
        walletId,
      ),
    [monthlyBalances, conversionRates, baseCurrency, walletMap, walletId],
  );

  // Get visible wallets and create chart config
  const visibleWallets = useMemo(() => {
    if (walletId) {
      // When walletId is provided, show only that wallet
      const wallet = walletMap.get(walletId);
      return wallet ? [wallet] : [];
    } else {
      // When no walletId, show all wallets that have data
      const walletIds = new Set(monthlyBalances?.map((b) => b.wallet_id) ?? []);
      return Array.from(walletMap.values()).filter((w) => walletIds.has(w.id));
    }
  }, [walletMap, monthlyBalances, walletId]);

  const chartConfig: ChartConfig = useMemo(() => {
    return visibleWallets.reduce(
      (acc, wallet) => ({
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
      const balance =
        (chartData[chartData.length - 1][wallet.id] as number) || 0;
      return total + balance;
    }, 0);
    const previous = visibleWallets.reduce((total, wallet) => {
      const balance =
        (chartData[chartData.length - 2][wallet.id] as number) || 0;
      return total + balance;
    }, 0);
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const percentageChange = calculatePercentageChange();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {walletId ? "Wallet Balance" : "Accumulated Total"}
          </CardTitle>
          <CardDescription>
            {walletId
              ? `Showing balance over time in ${baseCurrency}`
              : `Showing total balance over time by wallet in ${baseCurrency}`}
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
          <CardTitle>
            {walletId ? "Wallet Balance" : "Accumulated Total"}
          </CardTitle>
          <CardDescription>
            {walletId
              ? `Showing balance over time in ${baseCurrency}`
              : `Showing total balance over time by wallet in ${baseCurrency}`}
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
  console.log(chartData);
  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {walletId ? "Wallet Balance" : "Accumulated Total"}
          </CardTitle>
          <CardDescription>
            {walletId
              ? `Showing balance over time in ${baseCurrency}`
              : `Showing total balance over time by wallet in ${baseCurrency}`}
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
        <CardTitle>
          {walletId ? "Wallet Balance" : "Accumulated Total"}
        </CardTitle>
        <CardDescription>
          {walletId
            ? `Showing balance over time in ${baseCurrency}`
            : `Showing total balance over time by wallet in ${baseCurrency}`}
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
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
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
                          <Money
                            cents={Math.round(total * 100)}
                            currency={baseCurrency}
                          />
                        </span>
                      </div>
                      <div className="grid gap-1">
                        {payload
                          .filter((item) => !!item.value)
                          .sort(
                            (a, b) => (b.value as number) - (a.value as number),
                          )
                          .map((item) => {
                            const wallet = walletMap.get(
                              item.dataKey as string,
                            );
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
                                  <Money
                                    cents={Math.round(
                                      (item.value as number) * 100,
                                    )}
                                    currency={baseCurrency}
                                  />
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
