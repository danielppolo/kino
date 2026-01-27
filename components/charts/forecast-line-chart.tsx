"use client";

import { addMonths, format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { useQuery } from "@tanstack/react-query";

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
import {
  calculateMonthlyTotals,
  calculateWeightedTrend,
  forecastIncomeExpense,
  formatCurrency,
  parseMonthDate,
  projectRecurringTransactions,
  type ChartDataPoint,
  type MonthlyStats,
} from "@/utils/chart-helpers";
import { createClient } from "@/utils/supabase/client";
import {
  getMonthlyStats,
  getWalletMonthlyBalances,
  listRecurringTransactions,
} from "@/utils/supabase/queries";

interface ForecastLineChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

/**
 * Calculate advanced forecast using multiple strategies:
 * 1. Weighted recent data trend
 * 2. Income/expense decomposition
 * 3. Recurring transactions
 */
function calculateAdvancedForecast(
  historicalData: ChartDataPoint[],
  monthlyStats: MonthlyStats[],
  recurringTransactions: any[],
  visibleWallets: Array<{ id: string }>,
  conversionRates: Record<string, { rate: number }>,
  baseCurrency: string,
  walletMap: Map<string, any>,
  walletId?: string,
): ChartDataPoint[] {
  if (historicalData.length < 2) {
    return [];
  }

  const forecastData: ChartDataPoint[] = [];
  const lastDataPoint = historicalData[historicalData.length - 1];
  const lastMonth = new Date(lastDataPoint.month);

  // Strategy 1: Weighted recent data trend
  const weightedTrends = calculateWeightedTrend(
    historicalData,
    visibleWallets,
    12,
  );

  // Strategy 3: Income/expense decomposition
  const incomeExpenseForecast = forecastIncomeExpense(
    monthlyStats,
    conversionRates,
    baseCurrency,
    walletMap,
    12,
    walletId,
  );

  // Strategy 2: Recurring transactions projection
  const recurringProjections = projectRecurringTransactions(
    recurringTransactions,
    conversionRates,
    baseCurrency,
    walletMap,
    lastMonth,
    12,
    walletId,
  );

  // Generate forecast for next 12 months
  for (let i = 1; i <= 12; i++) {
    const forecastMonth = addMonths(lastMonth, i);
    const monthKey = format(forecastMonth, "yyyy-MM-dd");
    const forecastPoint: ChartDataPoint = {
      month: monthKey,
    };

    visibleWallets.forEach((wallet) => {
      const lastBalance =
        (lastDataPoint[wallet.id] as number | undefined) || 0;

      // Base forecast from weighted trend
      const weightedChange = weightedTrends[wallet.id] || 0;
      let forecastBalance = lastBalance + weightedChange * i;

      // Add income/expense decomposition (if available)
      // This adjusts the forecast based on separate income/expense trends
      if (monthlyStats.length > 0) {
        // Apply income/expense changes proportionally
        const netChange =
          incomeExpenseForecast.avgIncomeChange -
          incomeExpenseForecast.avgExpenseChange;
        forecastBalance += netChange * i;
      }

      // Add recurring transactions for this month
      const recurringForMonth = recurringProjections[monthKey];
      if (recurringForMonth && recurringForMonth[wallet.id]) {
        forecastBalance += recurringForMonth[wallet.id];
      }

      forecastPoint[wallet.id] = forecastBalance;
    });

    forecastData.push(forecastPoint);
  }

  return forecastData;
}

export function ForecastLineChart({
  walletId,
  from,
  to,
}: ForecastLineChartProps) {
  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  // Fetch monthly balances
  const {
    data: monthlyBalances,
    isLoading: isLoadingBalances,
    error: balancesError,
  } = useQuery({
    queryKey: ["forecast-line-chart-balances", walletId, from, to],
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

  // Fetch monthly stats for income/expense decomposition
  const {
    data: monthlyStats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: ["forecast-line-chart-stats", walletId, from, to],
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

  // Fetch recurring transactions
  const {
    data: recurringTransactions,
    isLoading: isLoadingRecurring,
    error: recurringError,
  } = useQuery({
    queryKey: ["forecast-line-chart-recurring", walletId],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await listRecurringTransactions(supabase, {
        walletId,
      });

      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = isLoadingBalances || isLoadingStats || isLoadingRecurring;
  const error = balancesError || statsError || recurringError;

  const historicalData = calculateMonthlyTotals(
    monthlyBalances ?? [],
    conversionRates,
    baseCurrency,
    walletMap,
    walletId,
  );

  // Get visible wallets
  let visibleWallets;
  if (walletId) {
    const wallet = walletMap.get(walletId);
    visibleWallets = wallet ? [wallet] : [];
  } else {
    const walletIds = new Set(monthlyBalances?.map((b) => b.wallet_id) ?? []);
    visibleWallets = Array.from(walletMap.values()).filter((w) => walletIds.has(w.id));
  }

  // Calculate forecast using advanced strategies
  const forecastData = calculateAdvancedForecast(
    historicalData,
    monthlyStats ?? [],
    recurringTransactions ?? [],
    visibleWallets,
    conversionRates,
    baseCurrency,
    walletMap,
    walletId,
  );

  // Combine historical and forecast data
  let combinedData = [];
  if (historicalData.length > 0) {
    const lastHistoricalMonth = historicalData[historicalData.length - 1].month;
    const combined = [...historicalData];

    // Mark forecast data points
    forecastData.forEach((point) => {
      combined.push({
        ...point,
        isForecast: true,
      });
    });

    combinedData = combined;
  }

  // Calculate total balance for chart display
  const historical = historicalData.map((point, index) => {
    const total = visibleWallets.reduce((sum, wallet) => {
      const balance = (point[wallet.id] as number | undefined) || 0;
      return sum + balance;
    }, 0);
    // Add forecast value to the last historical point for connection
    const isLastHistorical = index === historicalData.length - 1;
    return {
      month: point.month,
      total,
      forecast: isLastHistorical ? total : null,
      isForecast: false,
    };
  });

  const forecast = forecastData.map((point) => {
    const total = visibleWallets.reduce((sum, wallet) => {
      const balance = (point[wallet.id] as number | undefined) || 0;
      return sum + balance;
    }, 0);
    return {
      month: point.month,
      total: null,
      forecast: total,
      isForecast: true,
    };
  });

  const chartData = [...historical, ...forecast];

  const chartConfig: ChartConfig = {
    total: {
      label: "Total Balance",
      color: "hsl(var(--chart-1))",
    },
  };

  // Find the last historical month for the reference line
  const lastHistoricalMonth = historicalData.length === 0 ? null : historicalData[historicalData.length - 1].month;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {walletId ? "Wallet Forecast" : "Accumulated Forecast"}
          </CardTitle>
          <CardDescription>
            {walletId
              ? `Forecasting balance 1 year ahead in ${baseCurrency}`
              : `Forecasting total balance 1 year ahead in ${baseCurrency}`}
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
            {walletId ? "Wallet Forecast" : "Accumulated Forecast"}
          </CardTitle>
          <CardDescription>
            {walletId
              ? `Forecasting balance 1 year ahead in ${baseCurrency}`
              : `Forecasting total balance 1 year ahead in ${baseCurrency}`}
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
            {walletId ? "Wallet Forecast" : "Accumulated Forecast"}
          </CardTitle>
          <CardDescription>
            {walletId
              ? `Forecasting balance 1 year ahead in ${baseCurrency}`
              : `Forecasting total balance 1 year ahead in ${baseCurrency}`}
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
          {walletId ? "Wallet Forecast" : "Accumulated Forecast"}
        </CardTitle>
        <CardDescription>
          {walletId
            ? `Forecasting balance 1 year ahead in ${baseCurrency}`
            : `Forecasting total balance 1 year ahead in ${baseCurrency}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            />
            <ChartTooltip
              cursor={false}
              labelFormatter={(value) => format(parseMonthDate(value), "MMMM yyyy")}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                // Find the value from either total or forecast
                const totalPayload = payload.find((p) => p.dataKey === "total");
                const forecastPayload = payload.find(
                  (p) => p.dataKey === "forecast",
                );
                const dataPoint = totalPayload || forecastPayload;
                const isForecast = (dataPoint?.payload as any)?.isForecast;
                const value =
                  (dataPoint?.value as number) ||
                  (forecastPayload?.value as number) ||
                  0;

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {format(parseMonthDate(label), "MMMM yyyy")}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            isForecast ? "text-muted-foreground" : ""
                          }`}
                        >
                          {isForecast && (
                            <span className="mr-1 text-xs">(Forecast)</span>
                          )}
                          <Money
                            cents={Math.round(value * 100)}
                            currency={baseCurrency}
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {lastHistoricalMonth && (
              <ReferenceLine
                x={lastHistoricalMonth}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{ value: "Today", position: "top" }}
              />
            )}
            {/* Historical line - solid */}
            <Line
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            {/* Forecast line - dashed */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              strokeDasharray="5 5"
              strokeOpacity={0.7}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

