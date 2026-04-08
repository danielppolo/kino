"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { useChartControls } from "@/components/charts/shared/chart-controls-context";
import { useForecastQuery } from "@/components/charts/shared/use-forecast-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { calculateTrimmedMean, formatCurrency } from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyStats } from "@/utils/supabase/queries";

interface FireTargetProgressChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const WR_SCENARIOS = [0.02, 0.03, 0.035, 0.04, 0.05];

export function FireTargetProgressChart({
  walletId,
  from,
  to,
}: FireTargetProgressChartProps) {
  const { totalBalance } = useTotalBalance();
  const { conversionRates, baseCurrency } = useCurrency();
  const [wallets, walletMap] = useWallets();
  const controls = useChartControls();
  const effectiveMonthlySpend = controls?.effectiveMonthlySpend ?? 0;
  const selectedWR = controls?.selectedWR ?? 0.035;
  const assumedRealReturn = controls?.assumedRealReturn ?? 0.04;

  const workspaceWalletIds = useMemo(
    () => wallets.map((w) => w.id),
    [wallets],
  );
  const horizonMonths = (controls?.forecastHorizonYears ?? 1) * 12;

  const { data: forecastData } = useForecastQuery({
    walletId,
    walletIds: workspaceWalletIds,
    horizonMonths,
    baseCurrency,
    conversionRates,
  });

  const { data: monthlyStats } = useQuery({
    queryKey: ["fire-target-stats", walletId, from, to, baseCurrency],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyStats(supabase, {
        walletId,
        from,
        to,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { netMonthlySavings } = useMemo(() => {
    if (!monthlyStats || monthlyStats.length === 0) {
      return { netMonthlySavings: 0 };
    }

    const incomeByMonth: Record<string, number> = {};
    const expenseByMonth: Record<string, number> = {};

    monthlyStats.forEach((stat) => {
      if (!incomeByMonth[stat.month]) incomeByMonth[stat.month] = 0;
      if (!expenseByMonth[stat.month]) expenseByMonth[stat.month] = 0;

      const wallet = walletMap.get(stat.wallet_id ?? "");
      const currency = wallet?.currency ?? baseCurrency;

      incomeByMonth[stat.month] +=
        convertCurrency(
          stat.income_cents,
          currency,
          baseCurrency,
          conversionRates,
        ) / 100;
      expenseByMonth[stat.month] +=
        Math.abs(
          convertCurrency(
            stat.outcome_cents,
            currency,
            baseCurrency,
            conversionRates,
          ),
        ) / 100;
    });

    const avgIncome = calculateTrimmedMean(
      Object.values(incomeByMonth).filter((v) => v > 0),
    );
    const avgExpense = calculateTrimmedMean(
      Object.values(expenseByMonth).filter((v) => v > 0),
    );

    return { netMonthlySavings: avgIncome - avgExpense };
  }, [monthlyStats, walletMap, baseCurrency, conversionRates]);

  const currentBalance = totalBalance / 100;
  const annualSpend = effectiveMonthlySpend * 12;
  const fireNumber =
    selectedWR > 0 && annualSpend > 0 ? annualSpend / selectedWR : 0;
  const progressPct =
    fireNumber > 0 ? Math.min(1, currentBalance / fireNumber) : 0;
  const deficit = fireNumber > 0 ? Math.max(0, fireNumber - currentBalance) : 0;

  const forecastImpliedNetSavings = useMemo(() => {
    if (!forecastData?.forecast?.length) return null;
    const lastForecastValue =
      forecastData.forecast[forecastData.forecast.length - 1].value;
    return (lastForecastValue - currentBalance) / horizonMonths;
  }, [forecastData, currentBalance, horizonMonths]);

  const effectiveNetMonthlySavings =
    forecastImpliedNetSavings ?? netMonthlySavings;

  const monthsToFI = useMemo(() => {
    if (currentBalance >= fireNumber || fireNumber <= 0) return 0;
    const r = assumedRealReturn / 12;
    if (effectiveNetMonthlySavings <= 0) return Infinity;
    if (r === 0)
      return Math.ceil(
        (fireNumber - currentBalance) / effectiveNetMonthlySavings,
      );
    const top = Math.log(
      (fireNumber * r + effectiveNetMonthlySavings) /
        (currentBalance * r + effectiveNetMonthlySavings),
    );
    const bottom = Math.log(1 + r);
    if (bottom === 0 || top <= 0) return Infinity;
    return Math.ceil(top / bottom);
  }, [currentBalance, fireNumber, effectiveNetMonthlySavings, assumedRealReturn]);

  const yearsToFI = monthsToFI === Infinity ? null : monthsToFI / 12;

  const { optimisticYearsToFI, pessimisticYearsToFI } = useMemo(() => {
    if (!forecastData?.forecast?.length || fireNumber <= 0) {
      return { optimisticYearsToFI: null, pessimisticYearsToFI: null };
    }
    const r = assumedRealReturn / 12;
    const lastPoint = forecastData.forecast[forecastData.forecast.length - 1];
    const upperImpliedSavings =
      (lastPoint.upper - currentBalance) / horizonMonths;
    const lowerImpliedSavings =
      (lastPoint.lower - currentBalance) / horizonMonths;

    function monthsFromBalance(
      startBalance: number,
      monthlySavings: number,
    ): number | null {
      if (startBalance >= fireNumber) return 0;
      if (monthlySavings <= 0) return null;
      if (r === 0) return (fireNumber - startBalance) / monthlySavings;
      const top = Math.log(
        (fireNumber * r + monthlySavings) /
          (startBalance * r + monthlySavings),
      );
      const bottom = Math.log(1 + r);
      if (bottom === 0 || top <= 0) return null;
      return top / bottom;
    }

    const optMonths = monthsFromBalance(lastPoint.upper, upperImpliedSavings);
    const pessMonths = monthsFromBalance(lastPoint.lower, lowerImpliedSavings);

    return {
      optimisticYearsToFI:
        optMonths != null ? (horizonMonths + optMonths) / 12 : null,
      pessimisticYearsToFI:
        pessMonths != null ? (horizonMonths + pessMonths) / 12 : null,
    };
  }, [
    forecastData,
    currentBalance,
    fireNumber,
    assumedRealReturn,
    horizonMonths,
  ]);

  const progressColor =
    progressPct >= 1
      ? "#22c55e"
      : progressPct >= 0.5
        ? "#f59e0b"
        : "#ef4444";

  const wrScenarios = WR_SCENARIOS.map((wr) => ({
    wr,
    fireNumber: annualSpend > 0 ? annualSpend / wr : 0,
    progress:
      annualSpend > 0 ? Math.min(1, currentBalance / (annualSpend / wr)) : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          FIRE Target Progress
          <span
            className="ml-3 text-2xl font-bold tabular-nums"
            style={{ color: progressColor }}
          >
            {(progressPct * 100).toFixed(1)}%
          </span>
        </CardTitle>
        <CardDescription>
          {fireNumber > 0 ? (
            <>
              At {(selectedWR * 100).toFixed(1)}% withdrawal rate, your FIRE
              number is{" "}
              <strong>{formatCurrency(fireNumber, baseCurrency)}</strong>.{" "}
              {monthsToFI === 0
                ? "You have reached financial independence."
                : optimisticYearsToFI !== null &&
                    pessimisticYearsToFI !== null ? (
                  <>
                    ARIMA forecast implies FI in{" "}
                    <strong>
                      {optimisticYearsToFI.toFixed(1)}–
                      {pessimisticYearsToFI.toFixed(1)} years
                    </strong>{" "}
                    (optimistic → pessimistic) at{" "}
                    {(assumedRealReturn * 100).toFixed(0)}% real return.
                  </>
                ) : yearsToFI !== null ? (
                  `Estimated ${yearsToFI.toFixed(1)} years to FI at ${formatCurrency(effectiveNetMonthlySavings, baseCurrency)}/mo net savings and ${(assumedRealReturn * 100).toFixed(0)}% real return.`
                ) : (
                  "Increase net savings to project a timeline."
                )}
            </>
          ) : (
            "Set a monthly spend to calculate your FIRE number."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium tabular-nums">
              {formatCurrency(currentBalance, baseCurrency)}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {fireNumber > 0 ? formatCurrency(fireNumber, baseCurrency) : "—"}
            </span>
          </div>
          <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(progressPct * 100).toFixed(2)}%`,
                backgroundColor: progressColor,
              }}
            />
          </div>
          {deficit > 0 && (
            <div className="text-muted-foreground text-right text-xs">
              {formatCurrency(deficit, baseCurrency)} remaining
            </div>
          )}
          {forecastImpliedNetSavings != null && (
            <div className="text-muted-foreground text-xs">
              Net savings derived from{" "}
              {forecastData?.metadata?.method ?? "ARIMA"} forecast
            </div>
          )}
        </div>

        {/* WR scenario table */}
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-muted-foreground px-3 py-2 text-left font-medium">
                  Withdrawal Rate
                </th>
                <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                  FIRE Number
                </th>
                <th className="text-muted-foreground px-3 py-2 text-right font-medium">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {wrScenarios.map(({ wr, fireNumber: fn, progress }) => {
                const color =
                  progress >= 1
                    ? "#22c55e"
                    : progress >= 0.5
                      ? "#f59e0b"
                      : "#ef4444";
                return (
                  <tr
                    key={wr}
                    className={`border-b last:border-0 ${wr === selectedWR ? "bg-muted/30 font-medium" : ""}`}
                  >
                    <td className="px-3 py-2">
                      {(wr * 100).toFixed(1)}%
                      {wr === selectedWR && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          (active)
                        </span>
                      )}
                    </td>
                    <td className="tabular-nums px-3 py-2 text-right">
                      {fn > 0 ? formatCurrency(fn, baseCurrency) : "—"}
                    </td>
                    <td className="tabular-nums px-3 py-2 text-right">
                      <span style={{ color }}>
                        {(progress * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
