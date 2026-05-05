"use client";

import { differenceInCalendarMonths, format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { useQuery } from "@tanstack/react-query";

import { useChartControls } from "@/components/charts/shared/chart-controls-context";
import { useForecastQuery } from "@/components/charts/shared/use-forecast-query";
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
} from "@/components/ui/chart";
import { Money } from "@/components/ui/money";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import {
  calculateMonthlyTotals,
  formatCurrency,
  parseMonthDate,
} from "@/utils/chart-helpers";
import { createClient } from "@/utils/supabase/client";
import { getWalletMonthlyBalances } from "@/utils/supabase/queries";
import { Wallet } from "@/utils/supabase/types";

interface ForecastLineChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

export function ForecastLineChart({
  walletId,
  from,
  to,
}: ForecastLineChartProps) {
  const [wallets, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();
  const controls = useChartControls();
  const forecastMode = controls?.forecastMode ?? "with-income";
  const horizonYears = controls?.forecastHorizonYears ?? 1;
  const horizonMonths = horizonYears * 12;
  const workspaceWalletIds = wallets.map((w) => w.id);

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

  const {
    data: forecastData,
    isLoading: isLoadingForecast,
    error: forecastError,
  } = useForecastQuery({
    walletId,
    walletIds: workspaceWalletIds,
    horizonMonths,
    baseCurrency,
    conversionRates,
  });

  const isLoading = isLoadingBalances || isLoadingForecast;
  const error = balancesError || forecastError;
  const effectiveMonthlyBurn =
    controls?.effectiveMonthlySpend ??
    controls?.defaultMonthlySpend ??
    forecastData?.avgMonthlyBurn ??
    0;
  const futureLumpSum = controls?.futureLumpSum ?? 0;

  const historicalData = calculateMonthlyTotals(
    monthlyBalances ?? [],
    conversionRates,
    baseCurrency,
    walletMap,
    walletId,
  );

  let visibleWallets: Wallet[];
  if (walletId) {
    const wallet = walletMap.get(walletId);
    visibleWallets = wallet ? [wallet] : [];
  } else {
    const walletIds = new Set(monthlyBalances?.map((b) => b.wallet_id) ?? []);
    visibleWallets = Array.from(walletMap.values()).filter((w) =>
      walletIds.has(w.id),
    );
  }

  type ChartPoint = {
    month: string;
    total: number | null;
    forecast: number | null;
    lower: number | null;
    upper: number | null;
    isForecast: boolean;
  };

  const historical: ChartPoint[] = historicalData.map((point, index) => {
    const total = visibleWallets.reduce(
      (sum: number, wallet: Wallet) =>
        sum + ((point[wallet.id] as number | undefined) || 0),
      0,
    );
    const isLast = index === historicalData.length - 1;
    return {
      month: point.month,
      total,
      forecast: isLast ? total : null,
      lower: null,
      upper: null,
      isForecast: false,
    };
  });

  const lastHistoricalTotal =
    historical.length > 0 ? (historical[historical.length - 1].total ?? 0) : 0;

  // With-income: ARIMA delta forecast anchored to current balance
  const firstForecastRaw =
    forecastData?.forecast[0]?.value ?? lastHistoricalTotal;
  const anchorDelta = lastHistoricalTotal - firstForecastRaw;

  const withIncomeForecast: ChartPoint[] = (forecastData?.forecast ?? []).map(
    (p, index, forecast) => ({
      month: p.month,
      total: null,
      forecast:
        p.value +
        anchorDelta +
        (index === forecast.length - 1 ? futureLumpSum : 0),
      lower:
        p.lower +
        anchorDelta +
        (index === forecast.length - 1 ? futureLumpSum : 0),
      upper:
        p.upper +
        anchorDelta +
        (index === forecast.length - 1 ? futureLumpSum : 0),
      isForecast: true,
    }),
  );

  // No-income: straight burn-down from current balance at avg monthly spend
  const noIncomeForecast: ChartPoint[] = (forecastData?.forecast ?? []).map(
    (p, i, forecast) => ({
      month: p.month,
      total: null,
      forecast: Math.max(
        0,
        lastHistoricalTotal -
          effectiveMonthlyBurn * (i + 1) +
          (i === forecast.length - 1 ? futureLumpSum : 0),
      ),
      lower: null,
      upper: null,
      isForecast: true,
    }),
  );

  const activeForecast =
    forecastMode === "with-income" ? withIncomeForecast : noIncomeForecast;
  const chartData: ChartPoint[] = [...historical, ...activeForecast];

  const getChartPointValue = (point: ChartPoint) =>
    point.total ?? point.forecast ?? 0;

  const getSlopeStats = (month: string, currentValue: number) => {
    const currentIndex = chartData.findIndex((point) => point.month === month);
    if (currentIndex <= 0) return null;

    const previousPoint = chartData[currentIndex - 1];
    const previousValue = getChartPointValue(previousPoint);
    const monthsBetween = Math.max(
      1,
      Math.abs(
        differenceInCalendarMonths(
          parseMonthDate(month),
          parseMonthDate(previousPoint.month),
        ),
      ),
    );
    const delta = currentValue - previousValue;
    const monthlySlope = delta / monthsBetween;
    const savingSlope = Math.max(0, monthlySlope);
    // 0 means no positive saving slope; 1 is approached as saving/month grows
    // infinitely relative to monthly burn.
    const slopeFactor =
      effectiveMonthlyBurn > 0
        ? savingSlope / (savingSlope + effectiveMonthlyBurn)
        : savingSlope > 0
          ? 1
          : 0;

    return {
      delta,
      monthlySlope,
      slopeFactor,
    };
  };

  const chartConfig: ChartConfig = {
    total: {
      label: "Total Balance",
      color: "hsl(var(--chart-1))",
    },
    forecast: {
      label:
        forecastMode === "with-income"
          ? "Forecast (with income)"
          : "Forecast (no income)",
      color: forecastMode === "with-income" ? "hsl(var(--chart-1))" : "#ef4444",
    },
  };

  const lastHistoricalMonth =
    historicalData.length === 0
      ? null
      : historicalData[historicalData.length - 1].month;

  const methodLabel = forecastData?.metadata.method ?? null;

  const title = walletId ? "Wallet Forecast" : "Accumulated Forecast";
  const description =
    forecastMode === "no-income"
      ? walletId
        ? `Projecting balance ${horizonYears} year${horizonYears > 1 ? "s" : ""} ahead with no new income using a monthly burn of ${formatCurrency(effectiveMonthlyBurn, baseCurrency)}${futureLumpSum > 0 ? ` and a final ${formatCurrency(futureLumpSum, baseCurrency)} lump sum` : ""}`
        : `Projecting total balance ${horizonYears} year${horizonYears > 1 ? "s" : ""} ahead with no new income using a monthly burn of ${formatCurrency(effectiveMonthlyBurn, baseCurrency)}${futureLumpSum > 0 ? ` and a final ${formatCurrency(futureLumpSum, baseCurrency)} lump sum` : ""}`
      : walletId
        ? `Forecasting balance ${horizonYears} year${horizonYears > 1 ? "s" : ""} ahead in ${baseCurrency}${futureLumpSum > 0 ? ` with a final ${formatCurrency(futureLumpSum, baseCurrency)} lump sum` : ""}`
        : `Forecasting total balance ${horizonYears} year${horizonYears > 1 ? "s" : ""} ahead in ${baseCurrency}${futureLumpSum > 0 ? ` with a final ${formatCurrency(futureLumpSum, baseCurrency)} lump sum` : ""}`;

  const forecastStroke =
    forecastMode === "with-income" ? "hsl(var(--chart-1))" : "#ef4444";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) =>
                format(parseMonthDate(value), "MMM yyyy")
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
            />

            {/* 95% confidence band — only for with-income ARIMA forecast */}
            {forecastMode === "with-income" &&
              activeForecast.map((p, i) => {
                const next = activeForecast[i + 1];
                if (p.lower == null || p.upper == null) return null;
                return (
                  <ReferenceArea
                    key={p.month}
                    x1={p.month}
                    x2={next?.month ?? p.month}
                    y1={p.lower}
                    y2={p.upper}
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.07}
                    strokeOpacity={0}
                  />
                );
              })}

            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                const month = String(label);
                const totalEntry = payload.find((p) => p.dataKey === "total");
                const forecastEntry = payload.find(
                  (p) => p.dataKey === "forecast",
                );
                const entry = totalEntry || forecastEntry;
                const isForecast = (entry?.payload as ChartPoint)?.isForecast;
                const value = (entry?.value as number) ?? 0;
                const lower = (entry?.payload as ChartPoint)?.lower;
                const upper = (entry?.payload as ChartPoint)?.upper;
                const slopeStats = getSlopeStats(month, value);

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-1.5">
                      <span className="text-sm font-medium">
                        {format(parseMonthDate(month), "MMMM yyyy")}
                      </span>
                      <div className="flex items-center justify-between gap-4">
                        <span
                          className={`text-sm ${isForecast ? "text-muted-foreground" : ""}`}
                        >
                          {isForecast
                            ? forecastMode === "with-income"
                              ? "Forecast"
                              : "No income"
                            : "Balance"}
                        </span>
                        <span className="text-sm font-medium">
                          <Money
                            cents={Math.round(value * 100)}
                            currency={baseCurrency}
                          />
                        </span>
                      </div>
                      {slopeStats && (
                        <div className="border-border grid gap-1 border-t pt-2">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground text-xs">
                              Slope factor
                            </span>
                            <span className="text-xs font-medium">
                              {slopeStats.slopeFactor.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-muted-foreground text-xs">
                            0 = no saving, 1 = unbounded saving slope
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground text-xs">
                              Monthly slope
                            </span>
                            <span className="text-xs font-medium">
                              <Money
                                cents={Math.round(
                                  slopeStats.monthlySlope * 100,
                                )}
                                currency={baseCurrency}
                                showSign
                              />
                            </span>
                          </div>
                        </div>
                      )}
                      {isForecast &&
                        forecastMode === "with-income" &&
                        lower != null &&
                        upper != null && (
                          <div className="text-muted-foreground text-xs">
                            95% CI:{" "}
                            <Money
                              cents={Math.round(lower * 100)}
                              currency={baseCurrency}
                            />{" "}
                            —{" "}
                            <Money
                              cents={Math.round(upper * 100)}
                              currency={baseCurrency}
                            />
                          </div>
                        )}
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

            {/* Historical — solid */}
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
            {/* Forecast — dashed, color reflects mode */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke={forecastStroke}
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
      {methodLabel && (
        <CardFooter>
          <span className="text-muted-foreground rounded border px-2 py-0.5 font-mono text-xs">
            {methodLabel}
          </span>
        </CardFooter>
      )}
    </Card>
  );
}
