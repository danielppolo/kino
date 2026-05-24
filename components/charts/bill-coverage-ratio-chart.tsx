"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

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
import { formatCurrency } from "@/utils/chart-helpers";
import { ChartColors } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import { getBillCoverageRatio } from "@/utils/supabase/queries";

interface BillCoverageRatioChartProps {
  walletId?: string;
}

interface ChartDataPoint {
  wallet: string;
  balance: number;
  bills_30: number;
  bills_60: number;
  bills_90: number;
}

export function BillCoverageRatioChart({
  walletId,
}: BillCoverageRatioChartProps) {
  const {
    data: coverageData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bill-coverage-ratio", walletId],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getBillCoverageRatio(supabase, {
        walletId,
      });

      if (error) throw error;
      return data;
    },
  });

  const [wallets, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (!coverageData) return [];

    return coverageData
      .map((data) => {
        const wallet = walletMap.get(data.wallet_id);
        if (!wallet) return null;

        const rate = conversionRates[wallet.currency]?.rate ?? 1;

        return {
          wallet: data.wallet_name,
          balance: (data.current_balance_cents * rate) / 100,
          bills_30: (data.upcoming_bills_30_days_cents * rate) / 100,
          bills_60: (data.upcoming_bills_60_days_cents * rate) / 100,
          bills_90: (data.upcoming_bills_90_days_cents * rate) / 100,
        };
      })
      .filter((d): d is ChartDataPoint => d !== null);
  }, [coverageData, conversionRates, walletMap]);

  const chartConfig: ChartConfig = {
    balance: {
      label: "Current Balance",
      color: ChartColors.hsl.green,
    },
    bills_30: {
      label: "30-Day Bills",
      color: ChartColors.hsl.lightYellow,
    },
    bills_60: {
      label: "60-Day Bills",
      color: ChartColors.hsl.lightOrange,
    },
    bills_90: {
      label: "90-Day Bills",
      color: ChartColors.hsl.red,
    },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bill Coverage Ratio</CardTitle>
          <CardDescription>
            Current balance vs upcoming bills in {baseCurrency}
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
          <CardTitle>Bill Coverage Ratio</CardTitle>
          <CardDescription>
            Current balance vs upcoming bills in {baseCurrency}
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
          <CardTitle>Bill Coverage Ratio</CardTitle>
          <CardDescription>
            Current balance vs upcoming bills in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Coverage Ratio</CardTitle>
        <CardDescription>
          Current balance vs upcoming bills in {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
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
              dataKey="wallet"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                const balance =
                  (payload.find((p) => p.dataKey === "balance")
                    ?.value as number) || 0;
                const bills30 =
                  (payload.find((p) => p.dataKey === "bills_30")
                    ?.value as number) || 0;
                const bills60 =
                  (payload.find((p) => p.dataKey === "bills_60")
                    ?.value as number) || 0;
                const bills90 =
                  (payload.find((p) => p.dataKey === "bills_90")
                    ?.value as number) || 0;

                const ratio30 =
                  bills30 > 0 ? (balance / bills30).toFixed(2) : "∞";
                const ratio60 =
                  bills60 > 0 ? (balance / bills60).toFixed(2) : "∞";
                const ratio90 =
                  bills90 > 0 ? (balance / bills90).toFixed(2) : "∞";

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <div className="grid gap-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">
                            Balance:
                          </span>
                          <Money
                            cents={Math.round(balance * 100)}
                            currency={baseCurrency}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">
                            30-Day Bills:
                          </span>
                          <Money
                            cents={Math.round(bills30 * 100)}
                            currency={baseCurrency}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Ratio:</span>
                          <span className="font-medium">{ratio30}x</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">
                            60-Day Bills:
                          </span>
                          <Money
                            cents={Math.round(bills60 * 100)}
                            currency={baseCurrency}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Ratio:</span>
                          <span className="font-medium">{ratio60}x</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">
                            90-Day Bills:
                          </span>
                          <Money
                            cents={Math.round(bills90 * 100)}
                            currency={baseCurrency}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Ratio:</span>
                          <span className="font-medium">{ratio90}x</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="balance"
              fill={chartConfig.balance.color}
              radius={4}
            />
            <Bar
              dataKey="bills_30"
              fill={chartConfig.bills_30.color}
              radius={4}
            />
            <Bar
              dataKey="bills_60"
              fill={chartConfig.bills_60.color}
              radius={4}
            />
            <Bar
              dataKey="bills_90"
              fill={chartConfig.bills_90.color}
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
