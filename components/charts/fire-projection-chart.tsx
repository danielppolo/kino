"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { ChartSkeleton } from "@/components/charts/shared/chart-skeleton";
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
import {
  FireProjectionMonthPoint,
  simulateFireProjection,
} from "@/utils/fire-plan";

interface FireProjectionChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const MAX_PROJECTION_YEARS = 30;
const MAX_PROJECTION_MONTHS = MAX_PROJECTION_YEARS * 12;

const chartConfig: ChartConfig = {
  balance: {
    label: "Investable portfolio",
    color: "#3b82f6",
  },
  cashflow: {
    label: "Savings / withdrawals",
    color: "#f59e0b",
  },
  contextualAssetValue: {
    label: "Tracked assets (context only)",
    color: "#64748b",
  },
};

type ChartPoint = {
  year: number;
  balance: number;
  cashflow: number;
  ciLower: number | null;
  ciUpper: number | null;
  contextualAssetValue: number | null;
  phase: FireProjectionMonthPoint["phase"];
  isForecast: boolean;
  isProjection: boolean;
};

function sampleYearlyPoints(points: FireProjectionMonthPoint[]): ChartPoint[] {
  return points
    .filter((point) => point.month === 0 || point.month % 12 === 0)
    .map((point) => ({
      year: point.year,
      balance: point.balance,
      cashflow: point.cashflow,
      ciLower: null,
      ciUpper: null,
      contextualAssetValue: null,
      phase: point.phase,
      isForecast: point.isForecast,
      isProjection: !point.isForecast,
    }));
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
    effectiveMonthlySpend,
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
    retirementInflectionType,
    retirementInflectionYear,
    fullFireReachedYear,
    fullFireYearOptimistic,
    fullFireYearPessimistic,
    postRetirementMonthlyWithdrawal,
  } = useMemo(() => {
    const contextualValue = hasContextualAssets ? contextualAssetValue : null;
    const monthlyRate = assumedRealReturn / 12;
    const buildForecastCashflows = (balances: number[]) =>
      balances.map((balance, index) => {
        const previousBalance =
          index === 0 ? investableBalance : balances[index - 1];
        return balance - previousBalance * (1 + monthlyRate);
      });
    const forecastBalances = (forecastData?.forecast ?? []).map(
      (point) => point.value,
    );
    const forecastCashflows = buildForecastCashflows(forecastBalances);

    const baseline = simulateFireProjection({
      annualRealReturn: assumedRealReturn,
      downshiftTarget: downshiftFireNumber,
      forecastBalances,
      forecastCashflows,
      fullFireTarget: fullFireNumber,
      monthlySavings: historicalNetMonthlySavings,
      monthlySpend: effectiveMonthlySpend,
      startBalance: investableBalance,
      targetLowerMonthlyIncome,
      totalMonths: MAX_PROJECTION_MONTHS,
    });

    const yearlyData = sampleYearlyPoints(baseline.points).map((point) => ({
      ...point,
      contextualAssetValue: contextualValue,
    }));

    const confidenceByYear: Record<number, { lower: number; upper: number }> =
      {};
    for (let year = 1; year <= forecastHorizonYears; year++) {
      const forecastPoint = forecastData?.forecast?.[year * 12 - 1];
      if (forecastPoint) {
        confidenceByYear[year] = {
          lower: Math.max(0, forecastPoint.lower),
          upper: Math.max(0, forecastPoint.upper),
        };
      }
    }

    const chartPoints = yearlyData.map((point) => ({
      ...point,
      ciLower: confidenceByYear[point.year]?.lower ?? null,
      ciUpper: confidenceByYear[point.year]?.upper ?? null,
    }));

    const optimistic =
      forecastData?.forecast && forecastData.forecast.length > 0
        ? (() => {
            const optimisticBalances = forecastData.forecast.map(
              (point) => point.upper,
            );
            return simulateFireProjection({
              annualRealReturn: assumedRealReturn,
              downshiftTarget: downshiftFireNumber,
              forecastBalances: optimisticBalances,
              forecastCashflows: buildForecastCashflows(optimisticBalances),
              fullFireTarget: fullFireNumber,
              monthlySavings: historicalNetMonthlySavings,
              monthlySpend: effectiveMonthlySpend,
              startBalance: investableBalance,
              targetLowerMonthlyIncome,
              totalMonths: MAX_PROJECTION_MONTHS,
            });
          })()
        : null;

    const pessimistic =
      forecastData?.forecast && forecastData.forecast.length > 0
        ? (() => {
            const pessimisticBalances = forecastData.forecast.map(
              (point) => point.lower,
            );
            return simulateFireProjection({
              annualRealReturn: assumedRealReturn,
              downshiftTarget: downshiftFireNumber,
              forecastBalances: pessimisticBalances,
              forecastCashflows: buildForecastCashflows(pessimisticBalances),
              fullFireTarget: fullFireNumber,
              monthlySavings: historicalNetMonthlySavings,
              monthlySpend: effectiveMonthlySpend,
              startBalance: investableBalance,
              targetLowerMonthlyIncome,
              totalMonths: MAX_PROJECTION_MONTHS,
            });
          })()
        : null;

    return {
      chartData: chartPoints,
      fullFireReachedYear: baseline.fullFireReachedYear,
      fullFireYearOptimistic: optimistic?.fullFireReachedYear ?? null,
      fullFireYearPessimistic: pessimistic?.fullFireReachedYear ?? null,
      postRetirementMonthlyWithdrawal: baseline.postRetirementMonthlyWithdrawal,
      retirementInflectionType: baseline.retirementInflectionType,
      retirementInflectionYear: baseline.retirementInflectionYear,
    };
  }, [
    assumedRealReturn,
    contextualAssetValue,
    downshiftFireNumber,
    effectiveMonthlySpend,
    forecastData,
    forecastHorizonYears,
    fullFireNumber,
    hasContextualAssets,
    historicalNetMonthlySavings,
    investableBalance,
    targetLowerMonthlyIncome,
  ]);

  const methodLabel =
    forecastHorizonYears > 0 ? (forecastData?.metadata?.method ?? null) : null;
  const showDownshiftTarget =
    targetLowerMonthlyIncome > 0 &&
    downshiftFireNumber > 0 &&
    downshiftFireNumber < fullFireNumber;

  const yAxisFormatter = (value: number) => {
    if (Math.abs(value) >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `${(value / 1_000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

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
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Escape Plan Projection
          {retirementInflectionYear !== null && (
            <span className="ml-3 text-lg font-normal text-amber-500">
              {retirementInflectionType === "downshift"
                ? `Retire / downshift ~${retirementInflectionYear.toFixed(1)}y`
                : `Retire ~${retirementInflectionYear.toFixed(1)}y`}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Investable portfolio only.{" "}
          {forecastHorizonYears > 0 && methodLabel
            ? `Forecast controls the near-term path for ${forecastHorizonYears} year(s); after that the model uses ${formatCurrency(historicalNetMonthlySavings, baseCurrency)}/mo historical savings until retirement, then switches to spending-aware withdrawals.`
            : `0y forecast skips the forecast phase and projects directly from today using ${formatCurrency(historicalNetMonthlySavings, baseCurrency)}/mo historical savings until retirement.`}{" "}
          Full FIRE target:{" "}
          <strong>{formatCurrency(fullFireNumber, baseCurrency)}</strong> at{" "}
          {(selectedWR * 100).toFixed(1)}% WR.
          {showDownshiftTarget && (
            <>
              {" "}
              Downshift target:{" "}
              <strong>
                {formatCurrency(downshiftFireNumber, baseCurrency)}
              </strong>{" "}
              with{" "}
              <strong>
                {formatCurrency(targetLowerMonthlyIncome, baseCurrency)}/mo
              </strong>{" "}
              lower-income work.
            </>
          )}
          {retirementInflectionYear !== null && (
            <span className="mt-1 block text-amber-600 dark:text-amber-400">
              The inflection point is where accumulation turns into retirement
              withdrawals of{" "}
              <strong>
                {formatCurrency(postRetirementMonthlyWithdrawal, baseCurrency)}
                /mo
              </strong>
              .
            </span>
          )}
          {fullFireReachedYear !== null && (
            <span className="mt-1 block text-green-600 dark:text-green-400">
              Full FIRE threshold in ~{fullFireReachedYear.toFixed(1)}y
              {fullFireYearOptimistic !== null &&
              fullFireYearPessimistic !== null
                ? ` (${fullFireYearOptimistic.toFixed(1)}–${fullFireYearPessimistic.toFixed(1)}y forecast range)`
                : ""}
              .
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
          <ComposedChart
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
              yAxisId="balance"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={yAxisFormatter}
            />
            <YAxis
              yAxisId="cashflow"
              orientation="right"
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
                        {formatCurrency(point.balance, baseCurrency)}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      Cashflow: {formatCurrency(point.cashflow, baseCurrency)}
                      /mo {point.cashflow >= 0 ? "saved" : "withdrawn"}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      Phase:{" "}
                      {point.phase === "accumulation"
                        ? "Accumulation"
                        : point.phase === "downshift-retired"
                          ? "Downshift retirement"
                          : "Full retirement"}
                    </div>
                    {showDownshiftTarget && (
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        {point.balance >= downshiftFireNumber
                          ? "Supports lower-income work"
                          : `${formatCurrency(
                              downshiftFireNumber - point.balance,
                              baseCurrency,
                            )} to downshift`}
                      </div>
                    )}
                    {fullFireNumber > 0 && (
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
                        Forecast range:{" "}
                        {formatCurrency(point.ciLower, baseCurrency)}
                        {" — "}
                        {formatCurrency(point.ciUpper, baseCurrency)}
                      </div>
                    )}
                    {point.contextualAssetValue != null && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        Tracked assets:{" "}
                        {formatCurrency(
                          point.contextualAssetValue,
                          baseCurrency,
                        )}{" "}
                        excluded from FIRE capital
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
                  yAxisId="balance"
                />
              ))}

            {forecastHorizonYears > 0 && forecastData && (
              <ReferenceLine
                x={forecastHorizonYears}
                yAxisId="balance"
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

            <ReferenceLine
              yAxisId="cashflow"
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
            />

            {retirementInflectionYear !== null && (
              <ReferenceLine
                x={retirementInflectionYear}
                yAxisId="balance"
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value:
                    retirementInflectionType === "downshift"
                      ? `Downshift ~${retirementInflectionYear.toFixed(1)}y`
                      : `Retire ~${retirementInflectionYear.toFixed(1)}y`,
                  position: "top",
                  fontSize: 10,
                  fill: "#f59e0b",
                }}
              />
            )}

            {showDownshiftTarget && (
              <ReferenceLine
                yAxisId="balance"
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
                yAxisId="balance"
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

            <Area
              yAxisId="balance"
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
            <Line
              yAxisId="cashflow"
              dataKey="cashflow"
              name="Savings / withdrawals"
              type="monotone"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
            {hasContextualAssets && (
              <Line
                yAxisId="balance"
                dataKey="contextualAssetValue"
                name="Tracked assets (context only)"
                type="monotone"
                stroke="#64748b"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="text-muted-foreground text-xs">
          Positive cashflow means you are still saving into the portfolio.
          Negative cashflow means the model has crossed the retirement
          inflection point and is withdrawing from the portfolio to cover
          spending.
          {hasContextualAssets &&
            ` Tracked assets (${formatCurrency(contextualAssetValue, baseCurrency)}) stay separate as contextual fallback capital.`}
        </div>
      </CardFooter>
    </Card>
  );
}
