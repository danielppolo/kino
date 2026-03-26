"use client";

import { format } from "date-fns";
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
  formatCurrency,
  parseMonthDate,
} from "@/utils/chart-helpers";
import { createClient } from "@/utils/supabase/client";
import { getWalletMonthlyBalances } from "@/utils/supabase/queries";
import { Wallet } from "@/utils/supabase/types";
import type { ForecastApiResponse } from "@/app/api/forecast/route";

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

  // Historical monthly balances (for the left-hand portion of the chart)
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

  // ARIMA forecast from the server — cached server-side for 1 hour
  const {
    data: forecastData,
    isLoading: isLoadingForecast,
    error: forecastError,
  } = useQuery({
    queryKey: ["forecast-arima", walletId, baseCurrency],
    queryFn: async (): Promise<ForecastApiResponse> => {
      const workspaceWalletIds = wallets.map((w) => w.id);
      const res = await fetch("/api/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: walletId ?? null,
          walletIds: workspaceWalletIds,
          horizon: 12,
          baseCurrency,
          conversionRates,
        }),
      });
      if (!res.ok) throw new Error("Forecast API failed");
      return res.json();
    },
    // Don't re-fetch just because conversionRates reference changed — they're
    // stable within a session and the server caches by value anyway.
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const isLoading = isLoadingBalances || isLoadingForecast;
  const error = balancesError || forecastError;

  // Historical totals (per-wallet breakdown for tooltip)
  const historicalData = calculateMonthlyTotals(
    monthlyBalances ?? [],
    conversionRates,
    baseCurrency,
    walletMap,
    walletId,
  );

  // Visible wallets
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

  // Build chart data: historical (solid line) + ARIMA forecast (dashed line)
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
      // Bridge: duplicate the last historical value onto the forecast key so
      // the dashed line starts exactly where the solid line ends.
      forecast: isLast ? total : null,
      lower: null,
      upper: null,
      isForecast: false,
    };
  });

  const forecast: ChartPoint[] = (forecastData?.forecast ?? []).map((p) => ({
    month: p.month,
    total: null,
    forecast: p.value,
    lower: p.lower,
    upper: p.upper,
    isForecast: true,
  }));

  const chartData: ChartPoint[] = [...historical, ...forecast];

  const chartConfig: ChartConfig = {
    total: {
      label: "Total Balance",
      color: "hsl(var(--chart-1))",
    },
    forecast: {
      label: "Forecast",
      color: "hsl(var(--chart-1))",
    },
  };

  // x-value of the "today" reference line = last historical month
  const lastHistoricalMonth =
    historicalData.length === 0
      ? null
      : historicalData[historicalData.length - 1].month;

  // ── Forecast method badge text ──────────────────────────────────────────
  const methodLabel = forecastData?.metadata.method
    ? forecastData.metadata.method
    : null;

  const title = walletId ? "Wallet Forecast" : "Accumulated Forecast";
  const description = walletId
    ? `Forecasting balance 1 year ahead in ${baseCurrency}`
    : `Forecasting total balance 1 year ahead in ${baseCurrency}`;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">Loading...</div>
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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {methodLabel && (
            <span className="text-muted-foreground rounded border px-2 py-0.5 text-xs font-mono">
              {methodLabel}
            </span>
          )}
        </div>
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

            {/* 95% confidence band — only over forecast points */}
            {forecast.map((p, i) => {
              const next = forecast[i + 1];
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

                const totalEntry = payload.find((p) => p.dataKey === "total");
                const forecastEntry = payload.find(
                  (p) => p.dataKey === "forecast",
                );
                const entry = totalEntry || forecastEntry;
                const isForecast = (entry?.payload as ChartPoint)?.isForecast;
                const value = (entry?.value as number) ?? 0;
                const lower = (entry?.payload as ChartPoint)?.lower;
                const upper = (entry?.payload as ChartPoint)?.upper;

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="grid gap-1.5">
                      <span className="text-sm font-medium">
                        {format(parseMonthDate(label), "MMMM yyyy")}
                      </span>
                      <div className="flex items-center justify-between gap-4">
                        <span
                          className={`text-sm ${isForecast ? "text-muted-foreground" : ""}`}
                        >
                          {isForecast ? "Forecast" : "Balance"}
                        </span>
                        <span className="text-sm font-medium">
                          <Money
                            cents={Math.round(value * 100)}
                            currency={baseCurrency}
                          />
                        </span>
                      </div>
                      {isForecast && lower != null && upper != null && (
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
            {/* ARIMA forecast — dashed */}
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
