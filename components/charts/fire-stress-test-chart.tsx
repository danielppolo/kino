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

interface FireStressTestChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const STRESS_YEARS = 20;
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

  const { chartData, forecastMethod, scenarioSummary } = useMemo(() => {
    const forecastPoints = forecastData?.forecast ?? [];
    const monthlyRate = assumedRealReturn / 12;
    const totalMonths = STRESS_YEARS * 12;
    const monthlyBaseline: number[] = [];

    monthlyBaseline.push(investableBalance);

    for (let month = 1; month <= totalMonths; month++) {
      if (month <= forecastPoints.length) {
        monthlyBaseline.push(Math.max(0, forecastPoints[month - 1].value));
      } else {
        const previous = monthlyBaseline[month - 1] ?? investableBalance;
        monthlyBaseline.push(
          Math.max(0, previous * (1 + monthlyRate) + historicalNetMonthlySavings),
        );
      }
    }

    const baselineYearly = monthlyBaseline.filter((_, index) => index % 12 === 0);
    const shockStartBalance = monthlyBaseline[SHOCK_MONTH] ?? investableBalance;
    const preShockYearly = baselineYearly.slice(0, Math.floor(SHOCK_MONTH / 12) + 1);
    const inflationShockMonths = INFLATION_SHOCK_YEARS * 12;

    const inflationYearly: number[] = [...preShockYearly];
    {
      let balance = shockStartBalance;
      for (let month = SHOCK_MONTH; month <= totalMonths; month++) {
        if (month > SHOCK_MONTH && (month - SHOCK_MONTH) % 12 === 0) {
          inflationYearly.push(Math.max(0, balance));
        }
        const monthsIntoShock = month - SHOCK_MONTH;
        const inShock = monthsIntoShock < inflationShockMonths;
        const stressedRate = inShock ? (assumedRealReturn - 0.02) / 12 : monthlyRate;
        const stressedContribution = inShock
          ? historicalNetMonthlySavings - effectiveMonthlySpend * 0.08
          : historicalNetMonthlySavings;
        balance = balance * (1 + stressedRate) + stressedContribution;
      }
    }

    const drawdownYearly: number[] = [...preShockYearly];
    {
      let balance = shockStartBalance * (1 - DRAWDOWN_SHOCK_PCT);
      for (let month = SHOCK_MONTH; month <= totalMonths; month++) {
        if (month > SHOCK_MONTH && (month - SHOCK_MONTH) % 12 === 0) {
          drawdownYearly.push(Math.max(0, balance));
        }
        balance = balance * (1 + monthlyRate) + historicalNetMonthlySavings;
      }
    }

    const fxYearly: number[] = [...preShockYearly];
    {
      let balance = shockStartBalance * (1 - fxExposurePct * 0.2);
      for (let month = SHOCK_MONTH; month <= totalMonths; month++) {
        if (month > SHOCK_MONTH && (month - SHOCK_MONTH) % 12 === 0) {
          fxYearly.push(Math.max(0, balance));
        }
        balance = balance * (1 + monthlyRate) + historicalNetMonthlySavings;
      }
    }

    const ciByYear: Record<number, { lower: number; upper: number }> = {};
    for (let year = 1; year <= forecastHorizonYears; year++) {
      const point = forecastPoints[year * 12 - 1];
      if (point) {
        ciByYear[year] = {
          lower: Math.max(0, point.lower),
          upper: Math.max(0, point.upper),
        };
      }
    }

    const data = baselineYearly.map((baselineValue, index) => ({
      baseline: baselineValue,
      ciLower: ciByYear[index]?.lower ?? null,
      ciUpper: ciByYear[index]?.upper ?? null,
      drawdown: drawdownYearly[index] ?? 0,
      fx: fxYearly[index] ?? 0,
      inflation: inflationYearly[index] ?? 0,
      year: index,
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
      forecastMethod: forecastData?.metadata?.method ?? "forecast",
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
  ]);

  const yAxisFormatter = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
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
          {STRESS_YEARS}-year investable portfolio trajectories. Near-term uses{" "}
          {forecastMethod}; the tail uses{" "}
          {formatCurrency(historicalNetMonthlySavings, baseCurrency)}/mo
          historical net savings. Shocks branch off at year 1.
          {targetLowerMonthlyIncome > 0 && (
            <>
              {" "}
              Downshift target assumes{" "}
              <strong>{formatCurrency(targetLowerMonthlyIncome, baseCurrency)}/mo</strong>{" "}
              lower-income work.
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

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">Year {label}</div>
                    {payload.map((entry) => {
                      const balance = Number(entry.value ?? 0);

                      return (
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
                            {formatCurrency(balance, baseCurrency)}
                          </span>
                        </div>
                      );
                    })}
                    {downshiftFireNumber > 0 && (
                      <div className="text-muted-foreground mt-1 border-t pt-1 text-xs">
                        Downshift target:{" "}
                        {formatCurrency(downshiftFireNumber, baseCurrency)}
                      </div>
                    )}
                    {fullFireNumber > 0 && (
                      <div className="text-muted-foreground text-xs">
                        Full FIRE: {formatCurrency(fullFireNumber, baseCurrency)}
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
        </div>
      </CardFooter>
    </Card>
  );
}
