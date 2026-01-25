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
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { formatCurrency } from "@/utils/chart-helpers";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyBillStats } from "@/utils/supabase/queries";

interface BillsHistoryChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface ChartDataPoint {
  month: string;
  [key: string]: number | string;
}

// Helper to add transparency to color
function addTransparency(
  color: string | null | undefined,
  alpha: string,
): string {
  if (!color) return "hsl(var(--muted))";
  // If it's already a hex color, add transparency
  if (color.startsWith("#")) {
    return `${color}${alpha}`;
  }
  // Otherwise return as-is or fallback
  return color || "hsl(var(--muted))";
}

export function BillsHistoryChart({
  walletId,
  from,
  to,
}: BillsHistoryChartProps) {
  const {
    data: monthlyBillStats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bills-history-chart", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyBillStats(supabase, {
        walletId,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const [wallets, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  // Debug logging
  console.log("[BillsHistoryChart] Debug:", {
    walletId,
    from,
    to,
    monthlyBillStatsCount: monthlyBillStats?.length ?? 0,
    monthlyBillStats: monthlyBillStats?.slice(0, 3),
    walletsCount: wallets.length,
    walletMapSize: walletMap.size,
    walletMapKeys: Array.from(walletMap.keys()).slice(0, 5),
  });

  // Process data to convert to base currency and group by month
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!monthlyBillStats) return [];

    // Group by month and wallet
    const monthGroups: Record<
      string,
      Record<
        string,
        {
          total_bills: number;
          total_paid: number;
          total_outstanding: number;
        }
      >
    > = {};

    monthlyBillStats.forEach((stat) => {
      if (!monthGroups[stat.month]) {
        monthGroups[stat.month] = {};
      }

      const wallet = walletMap.get(stat.wallet_id);
      if (!wallet) {
        console.log("[BillsHistoryChart] Wallet NOT found for stat:", {
          wallet_id: stat.wallet_id,
          month: stat.month,
          walletMapKeys: Array.from(walletMap.keys()),
        });
        return;
      }

      const rate = conversionRates[wallet.currency]?.rate ?? 1;

      // Convert to base currency (keep as float for precision)
      const totalBills = (stat.total_bills_cents * rate) / 100;
      const totalPaid = (stat.total_paid_cents * rate) / 100;
      const totalOutstanding = (stat.total_outstanding_cents * rate) / 100;

      if (!monthGroups[stat.month][wallet.id]) {
        monthGroups[stat.month][wallet.id] = {
          total_bills: 0,
          total_paid: 0,
          total_outstanding: 0,
        };
      }

      monthGroups[stat.month][wallet.id].total_bills += totalBills;
      monthGroups[stat.month][wallet.id].total_paid += totalPaid;
      monthGroups[stat.month][wallet.id].total_outstanding += totalOutstanding;
    });

    // Convert to chart format
    return Object.entries(monthGroups)
      .map(([month, wallets]) => {
        const dataPoint: ChartDataPoint = { month };

        Object.entries(wallets).forEach(([walletId, values]) => {
          dataPoint[`${walletId}_bills`] = values.total_bills;
          dataPoint[`${walletId}_paid`] = values.total_paid;
          dataPoint[`${walletId}_outstanding`] = values.total_outstanding;
        });

        return dataPoint;
      })
      .sort(
        (a, b) =>
          new Date(a.month as string).getTime() -
          new Date(b.month as string).getTime(),
      );
  }, [monthlyBillStats, conversionRates, walletMap]);

  // Debug: Log chartData and visibleWallets computation
  console.log("[BillsHistoryChart] chartData:", {
    chartDataLength: chartData.length,
    chartData: chartData.slice(0, 3),
  });

  // Get visible wallets and create chart config
  let visibleWallets;
  if (walletId) {
    const wallet = walletMap.get(walletId);
    visibleWallets = wallet ? [wallet] : [];
    console.log("[BillsHistoryChart] Wallet lookup:", {
      walletId,
      walletFound: !!wallet,
      wallet: wallet ? { id: wallet.id, name: wallet.name } : null,
    });
  } else {
    const walletIds = new Set(monthlyBillStats?.map((b) => b.wallet_id) ?? []);
    visibleWallets = Array.from(walletMap.values()).filter((w) =>
      walletIds.has(w.id),
    );
    console.log("[BillsHistoryChart] Visible wallets (no walletId):", {
      walletIdsFromStats: Array.from(walletIds),
      visibleWalletsCount: visibleWallets.length,
    });
  }

  const config = visibleWallets.reduce(
    (acc, wallet) => ({
      ...acc,
      [`${wallet.id}_bills`]: {
        label: `${wallet.name} - Total Bills`,
        color: wallet.color || "hsl(var(--primary))",
      },
      [`${wallet.id}_paid`]: {
        label: `${wallet.name} - Paid`,
        color: addTransparency(wallet.color, "CC"),
      },
      [`${wallet.id}_outstanding`]: {
        label: `${wallet.name} - Outstanding`,
        color: addTransparency(wallet.color, "80"),
      },
    }),
    {} as ChartConfig,
  );

  const chartConfig: ChartConfig = config;

  // Calculate percentage change for outstanding bills
  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = visibleWallets.reduce((total, wallet) => {
      const outstanding =
        (chartData[chartData.length - 1][
          `${wallet.id}_outstanding`
        ] as number) || 0;
      return total + outstanding;
    }, 0);
    const previous = visibleWallets.reduce((total, wallet) => {
      const outstanding =
        (chartData[chartData.length - 2][
          `${wallet.id}_outstanding`
        ] as number) || 0;
      return total + outstanding;
    }, 0);
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const percentageChange = calculatePercentageChange();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{walletId ? "Bills History" : "Bills Overview"}</CardTitle>
          <CardDescription>
            {walletId
              ? `Showing bills history over time in ${baseCurrency}`
              : `Showing total bills by wallet over time in ${baseCurrency}`}
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
          <CardTitle>{walletId ? "Bills History" : "Bills Overview"}</CardTitle>
          <CardDescription>
            {walletId
              ? `Showing bills history over time in ${baseCurrency}`
              : `Showing total bills by wallet over time in ${baseCurrency}`}
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
          <CardTitle>{walletId ? "Bills History" : "Bills Overview"}</CardTitle>
          <CardDescription>
            {walletId
              ? `Showing bills history over time in ${baseCurrency}`
              : `Showing total bills by wallet over time in ${baseCurrency}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No bills data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{walletId ? "Bills History" : "Bills Overview"}</CardTitle>
        <CardDescription>
          {walletId
            ? `Showing bills history over time in ${baseCurrency}`
            : `Showing total bills by wallet over time in ${baseCurrency}`}
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
              domain={[0, "auto"]}
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) => format(new Date(value), "MMMM yyyy")}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                // Group by wallet
                const walletGroups: Record<
                  string,
                  {
                    bills: number;
                    paid: number;
                    outstanding: number;
                  }
                > = {};

                payload.forEach((item) => {
                  const dataKey = item.dataKey as string;
                  const match = dataKey.match(
                    /^(.+)_(bills|paid|outstanding)$/,
                  );
                  if (match) {
                    const [, walletId, type] = match;
                    if (!walletGroups[walletId]) {
                      walletGroups[walletId] = {
                        bills: 0,
                        paid: 0,
                        outstanding: 0,
                      };
                    }
                    walletGroups[walletId][
                      type as keyof (typeof walletGroups)[string]
                    ] = item.value as number;
                  }
                });

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {format(new Date(label), "MMMM yyyy")}
                        </span>
                      </div>
                      <div className="grid gap-2">
                        {Object.entries(walletGroups).map(
                          ([walletId, values]) => {
                            const wallet = walletMap.get(walletId);
                            if (!wallet) return null;
                            return (
                              <div key={walletId} className="grid gap-1">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: wallet.color }}
                                  />
                                  <span className="text-sm font-medium">
                                    {wallet.name}
                                  </span>
                                </div>
                                <div className="ml-4 grid gap-1 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">
                                      Total:
                                    </span>
                                    <Money
                                      cents={Math.round(values.bills * 100)}
                                      currency={baseCurrency}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">
                                      Paid:
                                    </span>
                                    <Money
                                      cents={Math.round(values.paid * 100)}
                                      currency={baseCurrency}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">
                                      Outstanding:
                                    </span>
                                    <Money
                                      cents={Math.round(
                                        values.outstanding * 100,
                                      )}
                                      currency={baseCurrency}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {visibleWallets.map((wallet) => (
              <React.Fragment key={wallet.id}>
                {/* Show paid bills at the bottom */}
                <Area
                  dataKey={`${wallet.id}_paid`}
                  name={`${wallet.name} - Paid`}
                  type="monotone"
                  fill={chartConfig[`${wallet.id}_paid`].color}
                  fillOpacity={0.5}
                  stroke={chartConfig[`${wallet.id}_paid`].color}
                  strokeWidth={2}
                  stackId={`wallet-${wallet.id}`}
                />
                {/* Show outstanding bills stacked on top */}
                <Area
                  dataKey={`${wallet.id}_outstanding`}
                  name={`${wallet.name} - Outstanding`}
                  type="monotone"
                  fill={chartConfig[`${wallet.id}_outstanding`].color}
                  fillOpacity={0.5}
                  stroke={chartConfig[`${wallet.id}_outstanding`].color}
                  strokeWidth={2}
                  stackId={`wallet-${wallet.id}`}
                />
              </React.Fragment>
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <TrendingIndicator
          percentageChange={percentageChange}
          startDate={
            chartData.length > 0 ? (chartData[0].month as string) : undefined
          }
          endDate={
            chartData.length > 0
              ? (chartData[chartData.length - 1].month as string)
              : undefined
          }
        />
      </CardFooter>
    </Card>
  );
}
