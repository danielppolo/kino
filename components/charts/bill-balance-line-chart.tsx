"use client";

import React from "react";
import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Money } from "@/components/ui/money";
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { formatCurrency, parseMonthDate } from "@/utils/chart-helpers";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyBillStats } from "@/utils/supabase/queries";

interface BillBalanceLineChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface ChartDataPoint {
  month: string;
  balance: number;
}

interface BillBalanceChartRendererProps {
  chartData: ChartDataPoint[];
  baseCurrency: string;
}

// Nested component that only renders when data is ready
function BillBalanceChartRenderer({
  chartData,
  baseCurrency,
}: BillBalanceChartRendererProps) {
  const chartConfig: ChartConfig = {
    balance: {
      label: "Outstanding Balance",
      color: "hsl(var(--chart-1))",
    },
  };

  // Calculate percentage change
  const calculatePercentageChange = () => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1].balance;
    const previous = chartData[chartData.length - 2].balance;
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const percentageChange = calculatePercentageChange();
  const currentBalance =
    chartData.length > 0 ? chartData[chartData.length - 1].balance : 0;

  return (
    <>
      <CardContent>
        <div className="mb-4">
          <div className="text-muted-foreground text-sm">
            Current Outstanding Balance
          </div>
          <div className="text-2xl font-bold">
            <Money
              cents={Math.round(currentBalance * 100)}
              currency={baseCurrency}
            />
          </div>
        </div>
        <ChartContainer config={chartConfig}>
          <LineChart
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
              tickFormatter={(value) => format(parseMonthDate(value), "MMM yyyy")}
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
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    format(parseMonthDate(value), "MMMM yyyy")
                  }
                  formatter={(value) => (
                    <Money
                      cents={Math.round((value as number) * 100)}
                      currency={baseCurrency}
                    />
                  )}
                />
              }
            />
            <Line
              dataKey="balance"
              type="monotone"
              stroke="var(--color-balance)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-balance)",
              }}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
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
    </>
  );
}

export function BillBalanceLineChart({
  walletId,
  from,
  to,
}: BillBalanceLineChartProps) {
  const {
    data: monthlyBillStats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bill-balance-line-chart", walletId, from, to],
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

  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  // Process data to convert to base currency and calculate total outstanding balance
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    if (
      !monthlyBillStats ||
      !walletMap.size ||
      !Object.keys(conversionRates).length
    ) {
      return [];
    }

    // Group by month
    const monthGroups: Record<string, number> = {};

    monthlyBillStats.forEach((stat) => {
      const wallet = walletMap.get(stat.wallet_id);
      if (!wallet) {
        return;
      }

      const rate = conversionRates[wallet.currency]?.rate ?? 1;

      // Convert outstanding balance to base currency
      const outstandingBalance = (stat.total_outstanding_cents * rate) / 100;

      if (!monthGroups[stat.month]) {
        monthGroups[stat.month] = 0;
      }

      monthGroups[stat.month] += outstandingBalance;
    });

    // Convert to chart format
    const result = Object.entries(monthGroups)
      .map(([month, balance]) => ({
        month,
        balance: Math.round(balance * 100) / 100, // Round to 2 decimals
      }))
      .sort(
        (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime(),
      );

    return result;
  }, [monthlyBillStats, conversionRates, walletMap, walletId]);

  // Determine if we have all required data for rendering
  const hasRequiredData =
    !isLoading &&
    !error &&
    monthlyBillStats !== undefined &&
    walletMap.size > 0 &&
    Object.keys(conversionRates).length > 0 &&
    chartData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bill Balance Over Time</CardTitle>
        <CardDescription>
          Outstanding bill balance trend in {baseCurrency}
        </CardDescription>
      </CardHeader>
      {isLoading && (
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            Loading...
          </div>
        </CardContent>
      )}
      {error && (
        <CardContent>
          <div className="flex h-64 items-center justify-center text-red-500">
            Error loading chart data
          </div>
        </CardContent>
      )}
      {!isLoading && !error && chartData.length === 0 && (
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No bill data available for this period
          </div>
        </CardContent>
      )}
      {hasRequiredData && (
        <BillBalanceChartRenderer
          chartData={chartData}
          baseCurrency={baseCurrency}
        />
      )}
    </Card>
  );
}
