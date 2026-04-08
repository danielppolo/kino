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
import { useFirePlanData } from "@/components/charts/shared/use-fire-plan-data";
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
import { formatCurrency } from "@/utils/chart-helpers";

interface FireProjectionChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const MAX_PROJECTION_YEARS = 30;

const chartConfig: ChartConfig = {
  balance: {
    label: "Investable portfolio",
    color: "#3b82f6",
  },
  contextualAssetValue: {
    label: "Tracked assets (context only)",
    color: "#64748b",
  },
};

type ChartPoint = {
  year: number;
  balance: number | null;
  ciLower: number | null;
  ciUpper: number | null;
  contextualAssetValue: number | null;
  isForecast: boolean;
  isProjection: boolean;
};

function findFirstYearAtTarget(
  data: ChartPoint[],
  targetBalance: number,
): number | null {
  if (targetBalance <= 0) return 0;

  for (const point of data) {
    if (point.balance != null && point.balance >= targetBalance) {
      return point.year;
    }
  }

  return null;
}

export function FireProjectionChart({
  walletId,
  from,
  to,
}: FireProjectionChartProps) {
  const controls = useChartControls();
  const assumedRealReturn = controls?.assumedRealReturn ?? 0.04;
  const forecastHorizonYears = controls?.forecastHorizonYears ?? 1;
  const horizonMonths = forecastHorizonYears * 12;

  const {
    baseCurrency,
    conversionRates,
    contextualAssetValue,
    downshiftFireNumber,
    fullFireNumber,
    hasContextualAssets,
    historicalNetMonthlySavings,
    investableBalance,
    isLoading: loadingFirePlan,
    selectedWR,
    targetLowerMonthlyIncome,
    workspaceWalletIds,
  } = useFirePlanData({
    walletId,
    from,
    to,
  });

  const { data: forecastData, isLoading: loadingForecast } = useForecastQuery({
    walletId,
    walletIds: workspaceWalletIds,
    horizonMonths,
    baseCurrency,
    conversionRates,
  });

  const isLoading = loadingFirePlan || loadingForecast;

  const {
    chartData,
    downshiftYear,
    fullFireYear,
    fullFireYearOptimistic,
    fullFireYearPessimistic,
  } = useMemo(() => {
    const monthlyRate = assumedRealReturn / 12;
    const stopAfterTargetMonths = 36;
    const forecast = forecastData?.forecast ?? [];
    const hasForecast = forecast.length > 0;
    const data: ChartPoint[] = [];

    const contextualValue = hasContextualAssets ? contextualAssetValue : null;

    if (hasForecast) {
      data.push({
        year: 0,
        balance: Math.max(0, investableBalance),
        ciLower: null,
        ciUpper: null,
        contextualAssetValue: contextualValue,
        isForecast: true,
        isProjection: false,
      });

      for (let year = 1; year <= forecastHorizonYears; year++) {
        const targetMonth = Math.min(year * 12 - 1, forecast.length - 1);
        const point = forecast[targetMonth];

        data.push({
          year,
          balance: Math.max(0, point.value),
          ciLower: Math.max(0, point.lower),
          ciUpper: Math.max(0, point.upper),
          contextualAssetValue: contextualValue,
          isForecast: true,
          isProjection: false,
        });
      }

      let balance = forecast[forecast.length - 1].value;
      let monthsPastTarget = 0;
      let reachedAnyTarget = false;

      for (let month = 1; month <= (MAX_PROJECTION_YEARS - forecastHorizonYears) * 12; month++) {
        balance = balance * (1 + monthlyRate) + historicalNetMonthlySavings;
        const absoluteYear = forecastHorizonYears + month / 12;

        if (month % 12 === 0) {
          data.push({
            year: absoluteYear,
            balance: Math.max(0, balance),
            ciLower: null,
            ciUpper: null,
            contextualAssetValue: contextualValue,
            isForecast: false,
            isProjection: true,
          });
        }

        if (
          !reachedAnyTarget &&
          ((downshiftFireNumber > 0 && balance >= downshiftFireNumber) ||
            (fullFireNumber > 0 && balance >= fullFireNumber))
        ) {
          reachedAnyTarget = true;
        }

        if (reachedAnyTarget) {
          monthsPastTarget += 1;
          if (monthsPastTarget > stopAfterTargetMonths) break;
        }
      }

      let optimisticYear: number | null = null;
      let pessimisticYear: number | null = null;

      if (fullFireNumber > 0) {
        const upperStart = forecast[forecast.length - 1].upper;
        if (upperStart >= fullFireNumber) {
          optimisticYear = forecastHorizonYears;
        } else {
          let balanceUpper = upperStart;
          for (
            let month = 1;
            month <= (MAX_PROJECTION_YEARS - forecastHorizonYears) * 12;
            month++
          ) {
            balanceUpper =
              balanceUpper * (1 + monthlyRate) + historicalNetMonthlySavings;
            if (balanceUpper >= fullFireNumber) {
              optimisticYear = forecastHorizonYears + month / 12;
              break;
            }
          }
        }

        const lowerStart = forecast[forecast.length - 1].lower;
        if (lowerStart >= fullFireNumber) {
          pessimisticYear = forecastHorizonYears;
        } else {
          let balanceLower = lowerStart;
          for (
            let month = 1;
            month <= (MAX_PROJECTION_YEARS - forecastHorizonYears) * 12;
            month++
          ) {
            balanceLower =
              balanceLower * (1 + monthlyRate) + historicalNetMonthlySavings;
            if (balanceLower >= fullFireNumber) {
              pessimisticYear = forecastHorizonYears + month / 12;
              break;
            }
          }
        }
      }

      return {
        chartData: data,
        downshiftYear: findFirstYearAtTarget(data, downshiftFireNumber),
        fullFireYear: findFirstYearAtTarget(data, fullFireNumber),
        fullFireYearOptimistic: optimisticYear,
        fullFireYearPessimistic: pessimisticYear,
      };
    }

    let balance = investableBalance;
    let monthsPastTarget = 0;
    let reachedAnyTarget = false;

    for (let month = 0; month <= MAX_PROJECTION_YEARS * 12; month++) {
      if (month % 12 === 0) {
        data.push({
          year: month / 12,
          balance: Math.max(0, balance),
          ciLower: null,
          ciUpper: null,
          contextualAssetValue: contextualValue,
          isForecast: false,
          isProjection: true,
        });
      }

      if (
        !reachedAnyTarget &&
        ((downshiftFireNumber > 0 && balance >= downshiftFireNumber) ||
          (fullFireNumber > 0 && balance >= fullFireNumber))
      ) {
        reachedAnyTarget = true;
      }

      if (reachedAnyTarget) {
        monthsPastTarget += 1;
        if (monthsPastTarget > stopAfterTargetMonths) break;
      }

      balance = balance * (1 + monthlyRate) + historicalNetMonthlySavings;
    }

    return {
      chartData: data,
      downshiftYear: findFirstYearAtTarget(data, downshiftFireNumber),
      fullFireYear: findFirstYearAtTarget(data, fullFireNumber),
      fullFireYearOptimistic: null,
      fullFireYearPessimistic: null,
    };
  }, [
    assumedRealReturn,
    contextualAssetValue,
    downshiftFireNumber,
    forecastData,
    forecastHorizonYears,
    fullFireNumber,
    hasContextualAssets,
    historicalNetMonthlySavings,
    investableBalance,
  ]);

  const yAxisFormatter = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return value.toFixed(0);
  };

  const methodLabel = forecastData?.metadata?.method ?? null;
  const showDownshiftTarget =
    targetLowerMonthlyIncome > 0 &&
    downshiftFireNumber > 0 &&
    downshiftFireNumber < fullFireNumber;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escape Plan Projection</CardTitle>
          <CardDescription>
            Projected portfolio growth against your escape-plan thresholds.
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
          Escape Plan Projection
          {showDownshiftTarget && downshiftYear !== null && (
            <span className="ml-3 text-lg font-normal text-amber-500">
              Downshift in ~{downshiftYear.toFixed(1)} years
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Investable portfolio only.{" "}
          {methodLabel
            ? `Near-term uses ${methodLabel}; beyond year ${forecastHorizonYears} uses a long-term projection with ${formatCurrency(historicalNetMonthlySavings, baseCurrency)}/mo historical net savings.`
            : `Long-term projection uses ${formatCurrency(historicalNetMonthlySavings, baseCurrency)}/mo historical net savings.`}{" "}
          Full FIRE target:{" "}
          <strong>{formatCurrency(fullFireNumber, baseCurrency)}</strong>{" "}
          at {(selectedWR * 100).toFixed(1)}% WR.
          {showDownshiftTarget && (
            <>
              {" "}
              Downshift target:{" "}
              <strong>{formatCurrency(downshiftFireNumber, baseCurrency)}</strong>
              {" "}with{" "}
              <strong>
                {formatCurrency(targetLowerMonthlyIncome, baseCurrency)}/mo
              </strong>{" "}
              lower-income work.
            </>
          )}
          {fullFireYear !== null && (
            <span className="mt-1 block text-green-600 dark:text-green-400">
              Full FIRE in ~{fullFireYear.toFixed(1)}y
              {fullFireYearOptimistic !== null && fullFireYearPessimistic !== null
                ? ` (${fullFireYearOptimistic.toFixed(1)}–${fullFireYearPessimistic.toFixed(1)}y forecast range)`
                : ""}
              .
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
              tickFormatter={(value) => `${value}y`}
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
                const point = payload[0].payload as ChartPoint;

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">
                      Year {point.year}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">
                        {point.balance != null
                          ? formatCurrency(point.balance, baseCurrency)
                          : "—"}
                      </span>
                    </div>
                    {showDownshiftTarget && point.balance != null && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        {point.balance >= downshiftFireNumber
                          ? "Supports lower-income work"
                          : `${formatCurrency(
                              downshiftFireNumber - point.balance,
                              baseCurrency,
                            )} to downshift`}
                      </div>
                    )}
                    {fullFireNumber > 0 && point.balance != null && (
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        {point.balance >= fullFireNumber
                          ? "Full FIRE reached"
                          : `${formatCurrency(
                              fullFireNumber - point.balance,
                              baseCurrency,
                            )} to full FIRE`}
                      </div>
                    )}
                    {point.ciLower != null && point.ciUpper != null && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        Forecast range: {formatCurrency(point.ciLower, baseCurrency)}
                        {" — "}
                        {formatCurrency(point.ciUpper, baseCurrency)}
                      </div>
                    )}
                    {point.contextualAssetValue != null && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        Tracked assets:{" "}
                        {formatCurrency(point.contextualAssetValue, baseCurrency)}{" "}
                        excluded from FIRE capital
                      </div>
                    )}
                    {point.isForecast && (
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        Near-term forecast
                      </div>
                    )}
                    {point.isProjection && (
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        Long-term projection
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {chartData
              .filter((point) => point.ciLower != null && point.ciUpper != null)
              .map((point) => (
                <ReferenceArea
                  key={point.year}
                  x1={point.year - 1}
                  x2={point.year}
                  y1={point.ciLower!}
                  y2={point.ciUpper!}
                  fill="#3b82f6"
                  fillOpacity={0.06}
                  stroke="none"
                />
              ))}

            {forecastData && forecastHorizonYears > 0 && (
              <ReferenceLine
                x={forecastHorizonYears}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{
                  value: "Forecast →",
                  position: "top",
                  fontSize: 9,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
            )}

            {showDownshiftTarget && (
              <ReferenceLine
                y={downshiftFireNumber}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: "Downshift target",
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "#f59e0b",
                }}
              />
            )}

            {fullFireNumber > 0 && (
              <ReferenceLine
                y={fullFireNumber}
                stroke="#22c55e"
                strokeDasharray="4 4"
                label={{
                  value: "Full FIRE",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#22c55e",
                }}
              />
            )}

            {showDownshiftTarget && downshiftYear !== null && (
              <ReferenceLine
                x={Math.round(downshiftYear)}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Downshift ~${downshiftYear.toFixed(1)}y`,
                  position: "top",
                  fontSize: 10,
                  fill: "#f59e0b",
                }}
              />
            )}

            {fullFireYear !== null && (
              <ReferenceLine
                x={Math.round(fullFireYear)}
                stroke="#22c55e"
                strokeDasharray="4 4"
                label={{
                  value: `Full FIRE ~${fullFireYear.toFixed(1)}y`,
                  position: "top",
                  fontSize: 10,
                  fill: "#22c55e",
                }}
              />
            )}

            <Area
              dataKey="balance"
              name="Investable portfolio"
              type="monotone"
              fill="#3b82f6"
              fillOpacity={0.15}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            {hasContextualAssets && (
              <Area
                dataKey="contextualAssetValue"
                name="Tracked assets (context only)"
                type="monotone"
                fill="#64748b"
                fillOpacity={0}
                stroke="#64748b"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="text-muted-foreground text-xs">
          {historicalNetMonthlySavings <= 0
            ? "Historical net savings is flat or negative, so timelines rely mostly on current capital and returns."
            : `Projection uses ${formatCurrency(historicalNetMonthlySavings, baseCurrency)}/mo historical net savings after the forecast horizon.`}
          {hasContextualAssets &&
            ` Tracked assets (${formatCurrency(contextualAssetValue, baseCurrency)}) stay separate as contextual fallback capital.`}
        </div>
      </CardFooter>
    </Card>
  );
}
