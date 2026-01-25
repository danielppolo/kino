"use client";

import React from "react";
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
import {
  useCurrency,
  useSettings,
  useWallets,
} from "@/contexts/settings-context";
import { calculateMonthlyTotals, formatCurrency } from "@/utils/chart-helpers";
import { createClient } from "@/utils/supabase/client";
import {
  getWalletMonthlyBalances,
  getWalletMonthlyOwed,
} from "@/utils/supabase/queries";

interface AccumulatedAreaChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

export function AccumulatedAreaChart({
  walletId,
  from,
  to,
}: AccumulatedAreaChartProps) {
  const { showOwedInBalance } = useSettings();

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

  // Fetch owed amounts (only when toggle is ON)
  const { data: monthlyOwed } = useQuery({
    queryKey: ["accumulated-area-chart-owed", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getWalletMonthlyOwed(supabase, {
        walletId,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
    enabled: showOwedInBalance,
  });

  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  // Merge owed into balance data
  let combinedData = [];
  if (!monthlyBalances) {
    combinedData = [];
  } else if (!showOwedInBalance || !monthlyOwed) {
    combinedData = monthlyBalances;
  } else {
    // Create lookup map: wallet_id-month -> owed_cents
    const owedMap = monthlyOwed.reduce(
      (acc, item) => {
        acc[`${item.wallet_id}-${item.month}`] = item.owed_cents;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Add owed_cents to each balance record
    combinedData = monthlyBalances.map((record) => ({
      ...record,
      owed_cents: owedMap[`${record.wallet_id}-${record.month}`] ?? 0,
    }));
  }

  const processed = calculateMonthlyTotals(
    combinedData ?? [],
    conversionRates,
    baseCurrency,
    walletMap,
    walletId,
  );

  // If showing owed, create stacked data structure
  let chartData;
  if (!showOwedInBalance || !monthlyOwed) {
    chartData = processed;
  } else {
    chartData = processed.map((item) => {
      const result: any = { month: item.month };

      // For each wallet in the data point, separate balance and owed
      Object.keys(item).forEach((key) => {
        if (key !== "month") {
          // Find the corresponding wallet data
          const walletData = combinedData.find(
            (d) =>
              walletMap.get(d.wallet_id)?.id === key && d.month === item.month,
          );

          if (walletData) {
            const wallet = walletMap.get(walletData.wallet_id);
            if (wallet) {
              const rate =
                conversionRates[wallet.currency]?.rate ?? 1;

              // Base balance (excluding owed)
              result[key] = Math.round(
                ((walletData.balance_cents - (walletData.owed_cents ?? 0)) *
                  rate) /
                  100,
              );

              // Owed amount
              result[`${key}_owed`] = Math.round(
                ((walletData.owed_cents ?? 0) * rate) / 100,
              );
            }
          } else {
            // No wallet data found, use original value
            result[key] = item[key];
          }
        }
      });

      return result;
    });
  }

  // Get visible wallets and create chart config
  let visibleWallets;
  if (walletId) {
    // When walletId is provided, show only that wallet
    const wallet = walletMap.get(walletId);
    visibleWallets = wallet ? [wallet] : [];
  } else {
    // When no walletId, show all wallets that have data
    const walletIds = new Set(monthlyBalances?.map((b) => b.wallet_id) ?? []);
    visibleWallets = Array.from(walletMap.values()).filter((w) => walletIds.has(w.id));
  }

  const config = visibleWallets.reduce(
    (acc, wallet) => ({
      ...acc,
      [wallet.id]: {
        label: wallet.name,
        color: wallet.color,
      },
    }),
    {} as ChartConfig,
  );

  // Add owed series when toggle is ON
  if (showOwedInBalance) {
    visibleWallets.forEach((wallet) => {
      config[`${wallet.id}_owed`] = {
        label: `${wallet.name} (owed)`,
        color: wallet.color
          ? `${wallet.color}80` // Add transparency
          : "hsl(var(--muted))",
      };
    });
  }

  const chartConfig: ChartConfig = config;

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
              <React.Fragment key={wallet.id}>
                <Area
                  dataKey={wallet.id}
                  name={wallet.name}
                  type="monotone"
                  fill={chartConfig[wallet.id].color}
                  fillOpacity={0.1}
                  stroke={chartConfig[wallet.id].color}
                  stackId="a"
                />
                {showOwedInBalance && (
                  <Area
                    dataKey={`${wallet.id}_owed`}
                    name={`${wallet.name} (owed)`}
                    type="monotone"
                    fill={chartConfig[`${wallet.id}_owed`]?.color || chartConfig[wallet.id].color}
                    fillOpacity={0.3}
                    stroke={chartConfig[`${wallet.id}_owed`]?.color || chartConfig[wallet.id].color}
                    stackId="a"
                  />
                )}
              </React.Fragment>
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
