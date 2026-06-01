"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import { buildTransactionSizeDistributionData } from "@/utils/transaction-size-distribution";

interface TransactionSizeDistributionChartProps {
  walletId?: string;
  from?: string;
  to?: string;
  type?: "income" | "expense";
}

export function TransactionSizeDistributionChart({
  walletId,
  from,
  to,
  type,
}: TransactionSizeDistributionChartProps) {
  const [wallets, walletMap] = useWallets();
  const workspaceWalletIds = wallets.map((w) => w.id);
  const { baseCurrency, conversionRates } = useCurrency();

  const {
    data: sizeData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "transaction-size-distribution",
      walletId,
      workspaceWalletIds,
      from,
      to,
      type,
    ],
    queryFn: async () => {
      const supabase = await createClient();
      const buildQuery = () => {
        let query = supabase
          .from("transactions")
          .select("amount_cents, wallet_id")
          .not("wallet_id", "is", null);

        if (walletId) {
          query = query.eq("wallet_id", walletId);
        } else if (workspaceWalletIds.length > 0) {
          query = query.in("wallet_id", workspaceWalletIds);
        }

        if (from) {
          query = query.gte("date", from);
        }

        if (to) {
          query = query.lte("date", to);
        }

        if (type) {
          query = query.eq("type", type);
        }

        return query;
      };

      const pageSize = 1000;
      let fromIndex = 0;
      let allData: Array<{
        amount_cents: number | null;
        wallet_id: string | null;
      }> = [];

      while (true) {
        const { data, error } = await buildQuery().range(
          fromIndex,
          fromIndex + pageSize - 1,
        );

        if (error) throw error;

        allData = allData.concat(data ?? []);

        if (!data || data.length < pageSize) {
          break;
        }

        fromIndex += pageSize;
      }

      return allData;
    },
  });

  const chartData = React.useMemo(() => {
    if (!sizeData) return [];

    return buildTransactionSizeDistributionData({
      rows: sizeData,
      walletMap,
      conversionRates,
      baseCurrency,
    }).map((data) => ({
      range: data.range,
      count: data.count,
      amountCents: data.total_amount_cents,
    }));
  }, [baseCurrency, conversionRates, sizeData, walletMap]);

  const chartConfig: ChartConfig = {
    count: {
      label: "Transaction Count",
      color: ChartColors.hsl.blue,
    },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction Size Distribution</CardTitle>
          <CardDescription>
            Distribution of transaction amounts in {baseCurrency}
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
          <CardTitle>Transaction Size Distribution</CardTitle>
          <CardDescription>
            Distribution of transaction amounts in {baseCurrency}
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
          <CardTitle>Transaction Size Distribution</CardTitle>
          <CardDescription>
            Distribution of transaction amounts in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No transaction data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Size Distribution</CardTitle>
        <CardDescription>
          Distribution of transaction amounts in {baseCurrency}
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
              dataKey="range"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              label={{ value: "Count", angle: -90, position: "insideLeft" }}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;

                const data = payload[0].payload;

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {data.range}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        <div>Count: {data.count}</div>
                        <div className="flex items-center gap-2">
                          <span>Total:</span>
                          <Money
                            cents={data.amountCents}
                            currency={baseCurrency}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" fill={chartConfig.count.color} radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
