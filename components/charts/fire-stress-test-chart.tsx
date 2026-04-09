"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
import {
  FireProjectionMonthPoint,
  getDownshiftMonthlyWithdrawal,
  simulateFireProjection,
} from "@/utils/fire-plan";

interface FireStressTestChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const STRESS_YEARS = 20;
const STRESS_MONTHS = STRESS_YEARS * 12;
const INFLATION_SHOCK_YEARS = 3;
const DRAWDOWN_SHOCK_PCT = 0.35;
const SHOCK_MONTH = 12;

const chartConfig: ChartConfig = {
  baseline: { label: "Baseline", color: "#3b82f6" },
  inflation: { label: "Inflation shock", color: "#f59e0b" },
  drawdown: { label: "35% drawdown", color: "#ef4444" },
  fx: { label: "FX shock", color: "#8b5cf6" },
};

type ScenarioName = "baseline" | "inflation" | "drawdown" | "fx";

type ScenarioMonthPoint = {
  month: number;
  year: number;
  balance: number;
  phase: FireProjectionMonthPoint["phase"];
};

function getScenarioStatusLabel({
  balance,
  downshiftTarget,
  fullFireTarget,
}: {
  balance: number;
  downshiftTarget: number;
  fullFireTarget: number;
}) {
  if (fullFireTarget > 0 && balance >= fullFireTarget) {
    return "still supports full FIRE";
  }
  if (downshiftTarget > 0 && balance >= downshiftTarget) {
    return "still supports downshift";
  }
  return "falls below downshift";
}

function sampleYearlyBalances(points: ScenarioMonthPoint[]) {
  return points
    .filter((point) => point.month === 0 || point.month % 12 === 0)
    .map((point) => ({
      balance: point.balance,
      phase: point.phase,
      year: point.year,
    }));
}

function simulateStressScenario({
  baselinePoints,
  downshiftTarget,
  fullFireTarget,
  monthlySavings,
  monthlySpend,
  targetLowerMonthlyIncome,
  annualRealReturn,
  shockBalanceMultiplier,
  shockExtraMonthlyOutflow = 0,
  shockReturnDelta = 0,
  shockMonths = 0,
}: {
  baselinePoints: FireProjectionMonthPoint[];
  downshiftTarget: number;
  fullFireTarget: number;
  monthlySavings: number;
  monthlySpend: number;
  targetLowerMonthlyIncome: number;
  annualRealReturn: number;
  shockBalanceMultiplier: number;
  shockExtraMonthlyOutflow?: number;
  shockReturnDelta?: number;
  shockMonths?: number;
}): ScenarioMonthPoint[] {
  const downshiftWithdrawal = getDownshiftMonthlyWithdrawal(
    monthlySpend,
    targetLowerMonthlyIncome,
  );
  const monthlyRate = annualRealReturn / 12;
  const points: ScenarioMonthPoint[] = baselinePoints
    .filter((point) => point.month <= SHOCK_MONTH)
    .map((point) => ({
      month: point.month,
      year: point.year,
      balance: point.balance,
      phase: point.phase,
    }));

  let balance = (baselinePoints[SHOCK_MONTH]?.balance ?? baselinePoints[0]?.balance ?? 0) *
    shockBalanceMultiplier;
  let phase = baselinePoints[SHOCK_MONTH]?.phase ?? "accumulation";

  for (let month = SHOCK_MONTH + 1; month <= STRESS_MONTHS; month++) {
    const monthsIntoShock = month - SHOCK_MONTH - 1;
    const inShock = monthsIntoShock < shockMonths;
    const adjustedRate = inShock ? monthlyRate + shockReturnDelta / 12 : monthlyRate;

    let cashflow = monthlySavings;
    if (phase === "downshift-retired") {
      cashflow = -downshiftWithdrawal;
    } else if (phase === "full-fire-retired") {
      cashflow = -Math.max(0, monthlySpend);
    }

    if (inShock) {
      cashflow -= shockExtraMonthlyOutflow;
    }

    balance = Math.max(0, balance * (1 + adjustedRate) + cashflow);

    if (phase === "accumulation") {
      if (
        downshiftTarget > 0 &&
        downshiftTarget < fullFireTarget &&
        balance >= downshiftTarget
      ) {
        phase = "downshift-retired";
      } else if (fullFireTarget > 0 && balance >= fullFireTarget) {
        phase = "full-fire-retired";
      }
    } else if (phase === "downshift-retired" && balance >= fullFireTarget) {
      phase = "full-fire-retired";
    }

    points.push({
      month,
      year: month / 12,
      balance,
      phase,
    });
  }

  return points;
}

export function FireStressTestChart({
  walletId,
  from,
  to,
}: FireStressTestChartProps) {
  const controls = useChartControls();
  const assumedRealReturn = controls?.assumedRealReturn ?? 0.04;
  const fxExposurePct = controls?.fxExposurePct ?? 0.5;
  const forecastHorizonYears = controls?.forecastHorizonYears ?? 1;
  const horizonMonths = forecastHorizonYears * 12;

  const {
    baseCurrency,
    contextualAssetValue,
    conversionRates,
    downshiftFireNumber,
    effectiveMonthlySpend,
    fullFireNumber,
    hasContextualAssets,
    historicalNetMonthlySavings,
    investableBalance,
    isLoading: loadingFirePlan,
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
    retirementInflectionYear,
    retirementInflectionType,
    scenarioSummary,
  } = useMemo(() => {
    const forecastBalances = (forecastData?.forecast ?? []).map(
      (point) => point.value,
    );

    const baseline = simulateFireProjection({
      annualRealReturn: assumedRealReturn,
      downshiftTarget: downshiftFireNumber,
      forecastBalances,
      fullFireTarget: fullFireNumber,
      monthlySavings: historicalNetMonthlySavings,
      monthlySpend: effectiveMonthlySpend,
      startBalance: investableBalance,
      targetLowerMonthlyIncome,
      totalMonths: STRESS_MONTHS,
    });

    const inflation = simulateStressScenario({
      annualRealReturn: assumedRealReturn,
      baselinePoints: baseline.points,
      downshiftTarget: downshiftFireNumber,
      fullFireTarget: fullFireNumber,
      monthlySavings: historicalNetMonthlySavings,
      monthlySpend: effectiveMonthlySpend,
      shockBalanceMultiplier: 1,
      shockExtraMonthlyOutflow: effectiveMonthlySpend * 0.08,
      shockMonths: INFLATION_SHOCK_YEARS * 12,
      shockReturnDelta: -0.02,
      targetLowerMonthlyIncome,
    });

    const drawdown = simulateStressScenario({
      annualRealReturn: assumedRealReturn,
      baselinePoints: baseline.points,
      downshiftTarget: downshiftFireNumber,
      fullFireTarget: fullFireNumber,
      monthlySavings: historicalNetMonthlySavings,
      monthlySpend: effectiveMonthlySpend,
      shockBalanceMultiplier: 1 - DRAWDOWN_SHOCK_PCT,
      targetLowerMonthlyIncome,
    });

    const fx = simulateStressScenario({
      annualRealReturn: assumedRealReturn,
      baselinePoints: baseline.points,
      downshiftTarget: downshiftFireNumber,
      fullFireTarget: fullFireNumber,
      monthlySavings: historicalNetMonthlySavings,
      monthlySpend: effectiveMonthlySpend,
      shockBalanceMultiplier: 1 - fxExposurePct * 0.2,
      targetLowerMonthlyIncome,
    });

    const baselineYearly = sampleYearlyBalances(
      baseline.points.map((point) => ({
        month: point.month,
        year: point.year,
        balance: point.balance,
        phase: point.phase,
      })),
    );
    const inflationYearly = sampleYearlyBalances(inflation);
    const drawdownYearly = sampleYearlyBalances(drawdown);
    const fxYearly = sampleYearlyBalances(fx);

    const ciByYear: Record<number, { lower: number; upper: number }> = {};
    for (let year = 1; year <= forecastHorizonYears; year++) {
      const point = forecastData?.forecast?.[year * 12 - 1];
      if (point) {
        ciByYear[year] = {
          lower: Math.max(0, point.lower),
          upper: Math.max(0, point.upper),
        };
      }
    }

    const data = baselineYearly.map((point, index) => ({
      baseline: point.balance,
      ciLower: ciByYear[point.year]?.lower ?? null,
      ciUpper: ciByYear[point.year]?.upper ?? null,
      drawdown: drawdownYearly[index]?.balance ?? 0,
      fx: fxYearly[index]?.balance ?? 0,
      inflation: inflationYearly[index]?.balance ?? 0,
      phase: point.phase,
      year: point.year,
    }));

    const finalPoint = data[data.length - 1];
    const summaries: Array<{ key: ScenarioName; label: string; status: string }> = [
      {
        key: "baseline",
        label: "Baseline",
        status: getScenarioStatusLabel({
          balance: finalPoint?.baseline ?? 0,
          downshiftTarget: downshiftFireNumber,
          fullFireTarget: fullFireNumber,
        }),
      },
      {
        key: "inflation",
        label: "Inflation shock",
        status: getScenarioStatusLabel({
          balance: finalPoint?.inflation ?? 0,
          downshiftTarget: downshiftFireNumber,
          fullFireTarget: fullFireNumber,
        }),
      },
      {
        key: "drawdown",
        label: "35% drawdown",
        status: getScenarioStatusLabel({
          balance: finalPoint?.drawdown ?? 0,
          downshiftTarget: downshiftFireNumber,
          fullFireTarget: fullFireNumber,
        }),
      },
      {
        key: "fx",
        label: "FX shock",
        status: getScenarioStatusLabel({
          balance: finalPoint?.fx ?? 0,
          downshiftTarget: downshiftFireNumber,
          fullFireTarget: fullFireNumber,
        }),
      },
    ];

    return {
      chartData: data,
      retirementInflectionType: baseline.retirementInflectionType,
      retirementInflectionYear: baseline.retirementInflectionYear,
      scenarioSummary: summaries,
    };
  }, [
    assumedRealReturn,
    downshiftFireNumber,
    effectiveMonthlySpend,
    forecastData,
    forecastHorizonYears,
    fxExposurePct,
    fullFireNumber,
    historicalNetMonthlySavings,
    investableBalance,
    targetLowerMonthlyIncome,
  ]);

  const yAxisFormatter = (value: number) => {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return value.toFixed(0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stress Test Scenarios</CardTitle>
          <CardDescription>
            Portfolio trajectories under escape-plan stress scenarios.
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
        <CardTitle>Stress Test Scenarios</CardTitle>
        <CardDescription>
          {STRESS_YEARS}-year investable portfolio trajectories.{" "}
          {forecastHorizonYears > 0
            ? `Forecast controls the first ${forecastHorizonYears} year(s) until the shock branches at year 1.`
            : "0y forecast projects directly from today before the stress branches."}{" "}
          Each scenario now switches from saving to retirement withdrawals at the
          first qualifying threshold.
          {retirementInflectionYear !== null && (
            <>
              {" "}
              Baseline retirement inflection:
              {" "}
              <strong>
                {retirementInflectionType === "downshift"
                  ? `downshift at ~${retirementInflectionYear.toFixed(1)}y`
                  : `full retirement at ~${retirementInflectionYear.toFixed(1)}y`}
              </strong>
              .
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
          <LineChart
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
              content={({ active, label, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as (typeof chartData)[0];

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">Year {label}</div>
                    {payload.map((entry) => (
                      <div
                        key={String(entry.dataKey)}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span>{entry.name}</span>
                        </div>
                        <span className="tabular-nums font-medium">
                          {formatCurrency(Number(entry.value ?? 0), baseCurrency)}
                        </span>
                      </div>
                    ))}
                    <div className="text-muted-foreground mt-1 border-t pt-1 text-xs">
                      Baseline phase:{" "}
                      {point.phase === "accumulation"
                        ? "Accumulation"
                        : point.phase === "downshift-retired"
                          ? "Downshift retirement"
                          : "Full retirement"}
                    </div>
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

            {forecastHorizonYears > 0 && forecastData && (
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

            {retirementInflectionYear !== null && (
              <ReferenceLine
                x={retirementInflectionYear}
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

            {downshiftFireNumber > 0 && (
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

            <Line
              dataKey="baseline"
              name="Baseline"
              type="monotone"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="inflation"
              name="Inflation shock"
              type="monotone"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              dataKey="drawdown"
              name="35% drawdown"
              type="monotone"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <Line
              dataKey="fx"
              name="FX shock"
              type="monotone"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>

        <div className="grid gap-2 md:grid-cols-2">
          {scenarioSummary.map((scenario) => (
            <div
              key={scenario.key}
              className="text-muted-foreground rounded-md border px-3 py-2 text-xs"
            >
              <span className="font-medium text-foreground">{scenario.label}:</span>{" "}
              {scenario.status} by year {STRESS_YEARS}.
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <div className="text-muted-foreground text-xs">
          Stress scenarios affect the investable portfolio only.
          {hasContextualAssets &&
            ` Tracked property value (${formatCurrency(
              contextualAssetValue,
              baseCurrency,
            )}) is contextual and illiquid, not counted as retireable capital.`}
          {" "}The baseline and shocked paths now stop accumulating once they
          cross into retirement mode and begin funding spend from the portfolio.
        </div>
      </CardFooter>
    </Card>
  );
}
