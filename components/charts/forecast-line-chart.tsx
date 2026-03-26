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
  findRecoveryStartIndex,
  forecastHoltWinters,
  formatCurrency,
  parseMonthDate,
  winsorize,
  type ChartDataPoint,
  type MonthlyStats,
} from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import {
  getMonthlyStats,
  getWalletMonthlyBalances,
} from "@/utils/supabase/queries";
import { Wallet } from "@/utils/supabase/types";

interface ForecastLineChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

// How many months of history to train on. 36 months (3 seasons) gives Holt-Winters
// enough data for seasonality while keeping the trend grounded in recent behavior.
const FORECAST_TRAINING_WINDOW = 36;

/**
 * Calculate forecast using Holt-Winters Triple Exponential Smoothing.
 *
 * Mirrors the AutonomyHorizonChart approach: aggregate all wallets into a single
 * combined net series, run one HW model, then apply projected changes cumulatively
 * from the last known total balance. Training is capped at the last 36 months so
 * the trend reflects recent behavior, not decade-old growth patterns.
 */
function calculateAdvancedForecast(
  historicalData: ChartDataPoint[],
  monthlyStats: MonthlyStats[],
  visibleWallets: Array<{ id: string }>,
  conversionRates: Record<string, { rate: number }>,
  baseCurrency: string,
  walletMap: Map<string, any>,
): ChartDataPoint[] {
  if (historicalData.length < 2) {
    return [];
  }

  const lastDataPoint = historicalData[historicalData.length - 1];
  const lastMonth = parseMonthDate(lastDataPoint.month);

  // Aggregate combined net (income − expenses) across all visible wallets per month
  const walletIdSet = new Set(visibleWallets.map((w) => w.id));
  const byMonth: Record<string, number> = {};
  monthlyStats.forEach((stat) => {
    if (!walletIdSet.has(stat.wallet_id)) return;
    if (!byMonth[stat.month]) byMonth[stat.month] = 0;
    const w = walletMap.get(stat.wallet_id);
    const currency = w?.currency ?? baseCurrency;
    const incomeBase = convertCurrency(stat.income_cents, currency, baseCurrency, conversionRates);
    const expenseBase = convertCurrency(stat.outcome_cents, currency, baseCurrency, conversionRates);
    byMonth[stat.month] += (incomeBase - expenseBase) / 100;
  });

  const sortedMonths = Object.keys(byMonth).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );
  const rawNetSeries = sortedMonths.map((m) => byMonth[m]).slice(-FORECAST_TRAINING_WINDOW);

  // Build a proxy cumulative balance from the net series for shock detection.
  // This captures the same trough pattern as the actual balance without requiring
  // a separate query — if a big expense hit in month N the cumulative dips there too.
  let cum = 0;
  const proxyCumBalance = rawNetSeries.map((net) => {
    cum += net;
    return cum;
  });

  // If there was an economic shock followed by recovery, train only on the
  // post-shock segment so the forecast reflects the current trajectory.
  const recoveryIdx = findRecoveryStartIndex(rawNetSeries, proxyCumBalance);
  const windowedSeries = recoveryIdx > 0 ? rawNetSeries.slice(recoveryIdx) : rawNetSeries;

  // Winsorize to dampen remaining one-time outliers before Holt-Winters.
  const netSeries = winsorize(windowedSeries);

  const projectedNetChanges = forecastHoltWinters(netSeries, 12);

  // Starting total balance = sum of all visible wallets at the last historical point
  let currentTotal = visibleWallets.reduce(
    (sum, wallet) => sum + ((lastDataPoint[wallet.id] as number | undefined) ?? 0),
    0,
  );

  // Apply projected net changes cumulatively; distribute total evenly across wallet
  // keys so the existing render step (which sums per-wallet values) still works.
  const walletCount = visibleWallets.length || 1;
  const forecastData: ChartDataPoint[] = [];

  for (let i = 1; i <= 12; i++) {
    const forecastMonth = addMonths(lastMonth, i);
    const monthKey = format(forecastMonth, "yyyy-MM-dd");
    currentTotal += projectedNetChanges[i - 1] ?? 0;
    const perWallet = currentTotal / walletCount;
    const forecastPoint: ChartDataPoint = { month: monthKey };
    visibleWallets.forEach((wallet) => {
      forecastPoint[wallet.id] = perWallet;
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

  // Fetch ALL monthly stats without date filter — the forecast model needs full history
  // regardless of what date range the user is currently viewing.
  const {
    data: monthlyStats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: ["forecast-line-chart-stats", walletId],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyStats(supabase, { walletId });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = isLoadingBalances || isLoadingStats;
  const error = balancesError || statsError;

  const historicalData = calculateMonthlyTotals(
    monthlyBalances ?? [],
    conversionRates,
    baseCurrency,
    walletMap,
    walletId,
  );

  // Get visible wallets
  let visibleWallets: Wallet[];
  if (walletId) {
    const wallet = walletMap.get(walletId);
    visibleWallets = wallet ? [wallet] : [];
  } else {
    const walletIds = new Set(monthlyBalances?.map((b) => b.wallet_id) ?? []);
    visibleWallets = Array.from(walletMap.values()).filter((w) => walletIds.has(w.id));
  }

  // Calculate forecast using advanced strategies (filter out null wallet_id for type)
  const filteredMonthlyStats = (monthlyStats ?? []).filter(
    (s) => s.wallet_id != null,
  ) as MonthlyStats[];
  const forecastData = calculateAdvancedForecast(
    historicalData,
    filteredMonthlyStats,
    visibleWallets,
    conversionRates,
    baseCurrency,
    walletMap,
  );

  // Combine historical and forecast data
  type ChartPointWithForecast = ChartDataPoint & { isForecast?: boolean };
  let combinedData: ChartPointWithForecast[] = [];
  if (historicalData.length > 0) {
    const combined: ChartPointWithForecast[] = [...historicalData];

    // Mark forecast data points
    forecastData.forEach((point) => {
      combined.push({
        ...point,
        isForecast: true,
      } as ChartPointWithForecast);
    });

    combinedData = combined;
  }

  // Calculate total balance for chart display
  const historical = historicalData.map((point, index) => {
    const total = visibleWallets.reduce((sum: number, wallet: Wallet) => {
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
    const total = visibleWallets.reduce((sum: number, wallet: Wallet) => {
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

