"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { formatCurrency } from "@/utils/chart-helpers";

interface FireProjectionChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const MAX_PROJECTION_YEARS = 30;

const chartConfig: ChartConfig = {
  balance: {
    label: "Portfolio",
    color: "#3b82f6",
  },
};

type ChartPoint = {
  year: number;
  balance: number | null;
  ciLower: number | null;
  ciUpper: number | null;
  isForecast: boolean;
  isProjection: boolean;
};

export function FireProjectionChart({
  walletId,
}: FireProjectionChartProps) {
  const { totalBalance } = useTotalBalance();
  const loadingStats = false;
  const { conversionRates, baseCurrency } = useCurrency();
  const [wallets] = useWallets();
  const controls = useChartControls();
  const effectiveMonthlySpend = controls?.effectiveMonthlySpend ?? 0;
  const selectedWR = controls?.selectedWR ?? 0.035;
  const assumedRealReturn = controls?.assumedRealReturn ?? 0.04;
  const forecastHorizonYears = controls?.forecastHorizonYears ?? 1;
  const horizonMonths = forecastHorizonYears * 12;

  const workspaceWalletIds = wallets.map((w) => w.id);

  const {
    data: forecastData,
    isLoading: loadingForecast,
  } = useForecastQuery({
    walletId,
    walletIds: workspaceWalletIds,
    horizonMonths,
    baseCurrency,
    conversionRates,
  });

  const isLoading = !!loadingStats || loadingForecast;

  const { chartData, fireNumber, fiYear, fiYearOptimistic, fiYearPessimistic, netMonthlySavings } = useMemo(() => {
    const currentBalance = totalBalance / 100;
    const annualSpend = effectiveMonthlySpend * 12;
    const fn =
      selectedWR > 0 && annualSpend > 0 ? annualSpend / selectedWR : 0;
    const r = assumedRealReturn / 12;
    const stopAfterFIMonths = 36; // show 3 years past FI date

    const forecast = forecastData?.forecast ?? [];
    const hasForecast = forecast.length > 0;

    // Compute net monthly savings implied by ARIMA forecast:
    // (lastForecastValue - currentBalance) / horizonMonths
    const lastForecastValue = hasForecast
      ? forecast[forecast.length - 1].value
      : currentBalance;
    const forecastImpliedNetMonthlySavings = hasForecast
      ? (lastForecastValue - currentBalance) / horizonMonths
      : 0;

    // Sample ARIMA forecast at yearly intervals (year 0 = current balance)
    // ARIMA forecast is monthly — pick the point closest to each year boundary
    const arimaYearlyPoints: Array<{
      year: number;
      balance: number;
      ciLower: number;
      ciUpper: number;
    }> = [];

    if (hasForecast) {
      // Year 0 = current balance (no CI)
      arimaYearlyPoints.push({
        year: 0,
        balance: currentBalance,
        ciLower: currentBalance,
        ciUpper: currentBalance,
      });

      for (let yr = 1; yr <= forecastHorizonYears; yr++) {
        const targetMonth = yr * 12 - 1; // 0-indexed: month 11 = year 1, etc.
        const idx = Math.min(targetMonth, forecast.length - 1);
        const pt = forecast[idx];
        arimaYearlyPoints.push({
          year: yr,
          balance: pt.value,
          ciLower: pt.lower,
          ciUpper: pt.upper,
        });
      }
    }

    // Build the chart data array
    const data: ChartPoint[] = [];

    if (hasForecast) {
      // Near-term: use ARIMA yearly samples
      for (const pt of arimaYearlyPoints) {
        data.push({
          year: pt.year,
          balance: Math.max(0, pt.balance),
          ciLower: pt.year === 0 ? null : Math.max(0, pt.ciLower),
          ciUpper: pt.year === 0 ? null : Math.max(0, pt.ciUpper),
          isForecast: true,
          isProjection: false,
        });
      }

      // Tail: compound-interest projection from last ARIMA value
      const tailStartBalance = lastForecastValue;
      let balance = tailStartBalance;
      let fiYear: number | null = null;
      let monthsPastFI = 0;

      const startYear = forecastHorizonYears;
      for (let m = 0; m <= (MAX_PROJECTION_YEARS - startYear) * 12; m++) {
        const absYear = startYear + m / 12;

        if (m % 12 === 0 && m > 0) {
          data.push({
            year: absYear,
            balance: Math.max(0, balance),
            ciLower: null,
            ciUpper: null,
            isForecast: false,
            isProjection: true,
          });
        }

        if (fn > 0 && balance >= fn && fiYear === null) {
          fiYear = absYear;
        }
        if (fiYear !== null) {
          monthsPastFI++;
          if (monthsPastFI > stopAfterFIMonths) break;
        }

        balance = balance * (1 + r) + forecastImpliedNetMonthlySavings;
      }

      // Find FI year from central line
      let centralFiYear: number | null = null;
      for (const pt of data) {
        if (fn > 0 && pt.balance != null && pt.balance >= fn) {
          centralFiYear = pt.year;
          break;
        }
      }

      // Optimistic FI: extrapolate from last ARIMA ciUpper
      let fiYearOptimistic: number | null = null;
      if (fn > 0 && hasForecast) {
        const lastPt = forecast[forecast.length - 1];
        let bal = lastPt.upper;
        for (let m = 1; m <= (MAX_PROJECTION_YEARS - forecastHorizonYears) * 12 + 1; m++) {
          bal = bal * (1 + r) + forecastImpliedNetMonthlySavings;
          if (bal >= fn) {
            fiYearOptimistic = forecastHorizonYears + m / 12;
            break;
          }
        }
        // Also check if upper bound already past FI at horizon
        if (lastPt.upper >= fn) {
          fiYearOptimistic = forecastHorizonYears;
        }
      }

      // Pessimistic FI: extrapolate from last ARIMA ciLower
      let fiYearPessimistic: number | null = null;
      if (fn > 0 && hasForecast) {
        const lastPt = forecast[forecast.length - 1];
        let bal = lastPt.lower;
        for (let m = 1; m <= (MAX_PROJECTION_YEARS - forecastHorizonYears) * 12 + 1; m++) {
          bal = bal * (1 + r) + forecastImpliedNetMonthlySavings;
          if (bal >= fn) {
            fiYearPessimistic = forecastHorizonYears + m / 12;
            break;
          }
        }
        if (lastPt.lower >= fn) {
          fiYearPessimistic = forecastHorizonYears;
        }
      }

      return {
        chartData: data,
        fireNumber: fn,
        fiYear: centralFiYear,
        fiYearOptimistic,
        fiYearPessimistic,
        netMonthlySavings: forecastImpliedNetMonthlySavings,
      };
    }

    // No forecast: classic compound-interest projection
    let balance = currentBalance;
    let fiYear: number | null = null;
    let monthsPastFI = 0;

    for (let m = 0; m <= MAX_PROJECTION_YEARS * 12; m++) {
      if (m % 12 === 0) {
        data.push({
          year: m / 12,
          balance: Math.max(0, balance),
          ciLower: null,
          ciUpper: null,
          isForecast: false,
          isProjection: true,
        });
      }

      if (fn > 0 && balance >= fn && fiYear === null) {
        fiYear = m / 12;
      }
      if (fiYear !== null) {
        monthsPastFI++;
        if (monthsPastFI > stopAfterFIMonths) break;
      }

      balance = balance * (1 + r) + effectiveMonthlySpend;
    }

    return {
      chartData: data,
      fireNumber: fn,
      fiYear,
      fiYearOptimistic: null,
      fiYearPessimistic: null,
      netMonthlySavings: effectiveMonthlySpend,
    };
  }, [
    totalBalance,
    effectiveMonthlySpend,
    selectedWR,
    assumedRealReturn,
    forecastData,
    forecastHorizonYears,
    horizonMonths,
  ]);

  const horizonYears = forecastHorizonYears;

  const yAxisFormatter = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toFixed(0);
  };

  const methodLabel = forecastData?.metadata?.method ?? null;

  const fiDescription = fiYear !== null
    ? (() => {
        let desc = `FI in ~${fiYear.toFixed(1)}y`;
        if (fiYearOptimistic !== null || fiYearPessimistic !== null) {
          const parts: string[] = [];
          if (fiYearOptimistic !== null)
            parts.push(`optimistic: ${fiYearOptimistic.toFixed(1)}y`);
          if (fiYearPessimistic !== null)
            parts.push(`pessimistic: ${fiYearPessimistic.toFixed(1)}y`);
          if (parts.length > 0) desc += ` (${parts.join(" / ")})`;
        }
        return desc;
      })()
    : null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>FIRE Projection</CardTitle>
          <CardDescription>
            Projected portfolio growth toward your FIRE target.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          FIRE Projection
          {fiYear !== null && (
            <span className="ml-3 text-lg font-normal text-green-500">
              FI in ~{fiYear.toFixed(1)} years
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Portfolio trajectory at{" "}
          {(assumedRealReturn * 100).toFixed(0)}% real return.{" "}
          {methodLabel
            ? `Near-term uses the ${methodLabel} model; beyond year ${horizonYears} uses compound-interest projection.`
            : `Compound-interest projection at ${formatCurrency(netMonthlySavings, baseCurrency)}/mo net savings.`}{" "}
          Targeting{" "}
          {fireNumber > 0
            ? formatCurrency(fireNumber, baseCurrency)
            : "—"}{" "}
          ({(selectedWR * 100).toFixed(1)}% WR).
          {fiDescription && (
            <span className="block mt-1 text-green-600 dark:text-green-400">
              {fiDescription}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[240px] w-full">
          <AreaChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 4 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `${v}y`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={yAxisFormatter}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as ChartPoint;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">
                      Year {d.year}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">
                        {d.balance != null
                          ? formatCurrency(d.balance, baseCurrency)
                          : "—"}
                      </span>
                    </div>
                    {d.ciLower != null && d.ciUpper != null && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        95% CI: {formatCurrency(d.ciLower, baseCurrency)} —{" "}
                        {formatCurrency(d.ciUpper, baseCurrency)}
                      </div>
                    )}
                    {d.isForecast && (
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        ARIMA forecast
                      </div>
                    )}
                    {d.isProjection && (
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        Compound-interest projection
                      </div>
                    )}
                    {fireNumber > 0 && d.balance != null && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        {d.balance >= fireNumber
                          ? "FIRE reached"
                          : `${formatCurrency(fireNumber - d.balance, baseCurrency)} to go`}
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* 95% CI band for ARIMA near-term points */}
            {chartData
              .filter((p) => p.ciLower != null && p.ciUpper != null)
              .map((p) => (
                <ReferenceArea
                  key={p.year}
                  x1={p.year - 1}
                  x2={p.year}
                  y1={p.ciLower!}
                  y2={p.ciUpper!}
                  fill="#3b82f6"
                  fillOpacity={0.06}
                  stroke="none"
                />
              ))}

            {/* ARIMA → compound-interest horizon boundary */}
            {horizonYears > 0 && forecastData && (
              <ReferenceLine
                x={horizonYears}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{
                  value: "ARIMA →",
                  position: "top",
                  fontSize: 9,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
            )}

            {/* FIRE target horizontal line */}
            {fireNumber > 0 && (
              <ReferenceLine
                y={fireNumber}
                stroke="#22c55e"
                strokeDasharray="4 4"
                label={{
                  value: "FIRE target",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#22c55e",
                }}
              />
            )}

            {/* FI date vertical line on central line */}
            {fiYear !== null && (
              <ReferenceLine
                x={Math.round(fiYear)}
                stroke="#22c55e"
                strokeDasharray="4 4"
                label={{
                  value: `FI ~${fiYear.toFixed(1)}y`,
                  position: "top",
                  fontSize: 10,
                  fill: "#22c55e",
                }}
              />
            )}

            <Area
              dataKey="balance"
              name="Portfolio"
              type="monotone"
              fill="#3b82f6"
              fillOpacity={0.15}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      {netMonthlySavings <= 0 && (
        <CardFooter>
          <div className="text-muted-foreground text-xs">
            Net monthly savings is negative or zero — increase income or reduce
            expenses to project a FI date.
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
