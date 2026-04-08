"use client";

import { useMemo } from "react";
import { CircleHelp } from "lucide-react";

import { useChartControls } from "@/components/charts/shared/chart-controls-context";
import { useFirePlanData } from "@/components/charts/shared/use-fire-plan-data";
import { useForecastQuery } from "@/components/charts/shared/use-forecast-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatCurrency } from "@/utils/chart-helpers";
import {
  computeDownshiftTarget,
  computeFireTarget,
  computeMonthsToTarget,
} from "@/utils/fire-plan";

interface FireTargetProgressChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const WR_SCENARIOS = [0.02, 0.03, 0.035, 0.04, 0.05];

function getProgressColor(progressPct: number) {
  if (progressPct >= 1) return "#22c55e";
  if (progressPct >= 0.5) return "#f59e0b";
  return "#ef4444";
}

function formatYearsLabel(years: number | null) {
  if (years == null) return "No projected timeline";
  if (years === 0) return "Ready now";
  return `${years.toFixed(1)} years`;
}

function TermHelp({
  term,
  description,
  iconOnly = false,
}: {
  term: string;
  description: string;
  iconOnly?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {!iconOnly && <span>{term}</span>}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex"
            aria-label={`Explain ${term}`}
          >
            <CircleHelp className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-w-64 text-xs leading-relaxed">
          {description}
        </PopoverContent>
      </Popover>
    </span>
  );
}

export function FireTargetProgressChart({
  walletId,
  from,
  to,
}: FireTargetProgressChartProps) {
  const controls = useChartControls();
  const assumedRealReturn = controls?.assumedRealReturn ?? 0.04;
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
  const hasSeparateDownshiftTarget =
    targetLowerMonthlyIncome > 0 && downshiftFireNumber < fullFireNumber;

  const fullProgressPct =
    fullFireNumber > 0 ? Math.min(1, investableBalance / fullFireNumber) : 0;
  const downshiftProgressPct =
    downshiftFireNumber > 0
      ? Math.min(1, investableBalance / downshiftFireNumber)
      : targetLowerMonthlyIncome > 0
        ? 1
        : 0;

  const fullMonthsToFI = useMemo(
    () =>
      computeMonthsToTarget({
        currentBalance: investableBalance,
        targetBalance: fullFireNumber,
        monthlyContribution: historicalNetMonthlySavings,
        annualRealReturn: assumedRealReturn,
      }),
    [
      assumedRealReturn,
      fullFireNumber,
      historicalNetMonthlySavings,
      investableBalance,
    ],
  );

  const downshiftMonthsToFI = useMemo(
    () =>
      computeMonthsToTarget({
        currentBalance: investableBalance,
        targetBalance: downshiftFireNumber,
        monthlyContribution: historicalNetMonthlySavings,
        annualRealReturn: assumedRealReturn,
      }),
    [
      assumedRealReturn,
      downshiftFireNumber,
      historicalNetMonthlySavings,
      investableBalance,
    ],
  );

  const fullYearsToFI =
    fullMonthsToFI == null ? null : Math.max(0, fullMonthsToFI / 12);
  const downshiftYearsToFI =
    downshiftMonthsToFI == null ? null : Math.max(0, downshiftMonthsToFI / 12);

  const forecastRange = useMemo(() => {
    if (!forecastData?.forecast?.length) {
      return {
        downshiftOptimistic: null,
        downshiftPessimistic: null,
        fullOptimistic: null,
        fullPessimistic: null,
      };
    }

    const lastPoint = forecastData.forecast[forecastData.forecast.length - 1];
    const optimisticDownshiftMonths = computeMonthsToTarget({
      currentBalance: Math.max(0, lastPoint.upper),
      targetBalance: downshiftFireNumber,
      monthlyContribution: historicalNetMonthlySavings,
      annualRealReturn: assumedRealReturn,
    });
    const pessimisticDownshiftMonths = computeMonthsToTarget({
      currentBalance: Math.max(0, lastPoint.lower),
      targetBalance: downshiftFireNumber,
      monthlyContribution: historicalNetMonthlySavings,
      annualRealReturn: assumedRealReturn,
    });
    const optimisticFullMonths = computeMonthsToTarget({
      currentBalance: Math.max(0, lastPoint.upper),
      targetBalance: fullFireNumber,
      monthlyContribution: historicalNetMonthlySavings,
      annualRealReturn: assumedRealReturn,
    });
    const pessimisticFullMonths = computeMonthsToTarget({
      currentBalance: Math.max(0, lastPoint.lower),
      targetBalance: fullFireNumber,
      monthlyContribution: historicalNetMonthlySavings,
      annualRealReturn: assumedRealReturn,
    });

    return {
      downshiftOptimistic:
        optimisticDownshiftMonths == null
          ? null
          : (horizonMonths + optimisticDownshiftMonths) / 12,
      downshiftPessimistic:
        pessimisticDownshiftMonths == null
          ? null
          : (horizonMonths + pessimisticDownshiftMonths) / 12,
      fullOptimistic:
        optimisticFullMonths == null
          ? null
          : (horizonMonths + optimisticFullMonths) / 12,
      fullPessimistic:
        pessimisticFullMonths == null
          ? null
          : (horizonMonths + pessimisticFullMonths) / 12,
    };
  }, [
    assumedRealReturn,
    downshiftFireNumber,
    forecastData,
    fullFireNumber,
    historicalNetMonthlySavings,
    horizonMonths,
  ]);

  const wrScenarios = WR_SCENARIOS.map((withdrawalRate) => {
    const scenarioFullTarget = computeFireTarget(
      effectiveMonthlySpend,
      withdrawalRate,
    );
    const scenarioDownshiftTarget = computeDownshiftTarget(
      effectiveMonthlySpend,
      targetLowerMonthlyIncome,
      withdrawalRate,
    );

    return {
      downshiftTarget: scenarioDownshiftTarget,
      fullProgress:
        scenarioFullTarget > 0
          ? Math.min(1, investableBalance / scenarioFullTarget)
          : 0,
      fullTarget: scenarioFullTarget,
      withdrawalRate,
    };
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escape Plan Progress</CardTitle>
          <CardDescription>
            Tracking downshift readiness and full FIRE progress.
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
        <CardTitle>Escape Plan Progress</CardTitle>
        <CardDescription>
          {hasSeparateDownshiftTarget ? (
            <>
              Downshift readiness asks when your portfolio plus{" "}
              <strong>
                {formatCurrency(targetLowerMonthlyIncome, baseCurrency)}/mo
              </strong>{" "}
              lower-income work can cover spending. Full FIRE asks when the
              portfolio can do it alone.
            </>
          ) : (
            <>
              Downshift readiness currently matches full FIRE because
              lower-income work is set to{" "}
              <strong>
                {formatCurrency(targetLowerMonthlyIncome, baseCurrency)}/mo
              </strong>
              . Set a non-zero lower-income target to separate the two
              thresholds.
            </>
          )}
          {hasContextualAssets && (
            <>
              {" "}
              Tracked assets (
              <strong>{formatCurrency(contextualAssetValue, baseCurrency)}</strong>)
              stay separate as contextual fallback capital.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasSeparateDownshiftTarget && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <span className="font-medium text-amber-500">
              Why both cards match:
            </span>{" "}
            <span className="text-muted-foreground">
              with MX$0/mo lower-income work, the downshift gap is the same as
              full spending, so both thresholds use the same target.
            </span>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              color: getProgressColor(downshiftProgressPct),
              label: hasSeparateDownshiftTarget
                ? "Downshift readiness"
                : "Downshift readiness (same as full FIRE)",
              progressPct: downshiftProgressPct,
              range:
                forecastRange.downshiftOptimistic != null &&
                forecastRange.downshiftPessimistic != null
                  ? `${forecastRange.downshiftOptimistic.toFixed(1)}–${forecastRange.downshiftPessimistic.toFixed(1)}y forecast range`
                  : null,
              target: downshiftFireNumber,
              years: downshiftYearsToFI,
            },
            {
              color: getProgressColor(fullProgressPct),
              label: "Full FIRE progress",
              progressPct: fullProgressPct,
              range:
                forecastRange.fullOptimistic != null &&
                forecastRange.fullPessimistic != null
                  ? `${forecastRange.fullOptimistic.toFixed(1)}–${forecastRange.fullPessimistic.toFixed(1)}y forecast range`
                  : null,
              target: fullFireNumber,
              years: fullYearsToFI,
            },
          ].map((item) => (
            <div key={item.label} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{item.label}</span>
                {item.label.startsWith("Downshift") ? (
                  <TermHelp
                    term="Downshift readiness"
                    description="Downshift readiness measures when your liquid portfolio plus lower-income work can cover spending, so you can step away from maximizing income."
                    iconOnly
                  />
                ) : (
                  <TermHelp
                    term="Full FIRE progress"
                    description="Full FIRE progress measures when the liquid portfolio alone can support the spending target without depending on any work income."
                    iconOnly
                  />
                )}
                <span
                  className="text-lg font-semibold tabular-nums"
                  style={{ color: item.color }}
                >
                  {(item.progressPct * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(item.progressPct * 100).toFixed(2)}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs tabular-nums">
                <span>{formatCurrency(investableBalance, baseCurrency)}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(item.target, baseCurrency)}
                </span>
              </div>
              <div className="text-muted-foreground text-xs">
                {item.years === 0
                  ? "Ready now."
                  : `${formatYearsLabel(item.years)} at ${formatCurrency(
                      historicalNetMonthlySavings,
                      baseCurrency,
                    )}/mo historical net savings and ${(
                      assumedRealReturn * 100
                    ).toFixed(0)}% real return.`}
              </div>
              {!hasSeparateDownshiftTarget &&
                item.label.startsWith("Downshift") && (
                  <div className="text-muted-foreground text-xs">
                    This matches full FIRE because no lower-income earnings are
                    offsetting spend yet.
                  </div>
                )}
              {item.range && (
                <div className="text-muted-foreground text-xs">{item.range}</div>
              )}
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                  <TermHelp
                    term="Withdrawal Rate"
                    description="The percentage of your portfolio you plan to spend each year. Lower rates mean a larger target but a more conservative plan."
                  />
                </th>
                <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                  <TermHelp
                    term="Full FIRE target"
                    description="The liquid portfolio needed for your investments alone to support the full annual spending target at the selected withdrawal rate."
                  />
                </th>
                <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                  <TermHelp
                    term="Downshift target"
                    description="The liquid portfolio needed if lower-income work keeps covering part of monthly spending, so the portfolio only funds the remaining gap."
                  />
                </th>
                <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                  <TermHelp
                    term="Full FIRE progress"
                    description="How much of the full FIRE target is already covered by your current investable portfolio."
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {wrScenarios.map((scenario) => (
                <tr
                  key={scenario.withdrawalRate}
                  className={`border-b last:border-0 ${
                    scenario.withdrawalRate === selectedWR
                      ? "bg-muted/30 font-medium"
                      : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    {(scenario.withdrawalRate * 100).toFixed(1)}%
                    {scenario.withdrawalRate === selectedWR && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        (active)
                      </span>
                    )}
                  </td>
                  <td className="tabular-nums px-3 py-2 text-right">
                    {formatCurrency(scenario.fullTarget, baseCurrency)}
                  </td>
                  <td className="tabular-nums px-3 py-2 text-right">
                    {hasSeparateDownshiftTarget
                      ? formatCurrency(scenario.downshiftTarget, baseCurrency)
                      : "Same as full FIRE"}
                  </td>
                  <td className="tabular-nums px-3 py-2 text-right">
                    <span style={{ color: getProgressColor(scenario.fullProgress) }}>
                      {(scenario.fullProgress * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
