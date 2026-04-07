"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { useQuery } from "@tanstack/react-query";

import { useChartControls } from "@/components/charts/shared/chart-controls-context";
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
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { calculateTrimmedMean, formatCurrency } from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyStats } from "@/utils/supabase/queries";

interface SavingsRateToFireChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const SAVINGS_RATE_BUCKETS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
const MAX_YEARS_DISPLAY = 50;

const chartConfig: ChartConfig = {
  years: {
    label: "Years to FI",
    color: "#3b82f6",
  },
};

function computeYearsToFI(
  fireNumber: number,
  monthlyContribution: number,
  r: number,
): number {
  if (fireNumber <= 0 || monthlyContribution <= 0) return MAX_YEARS_DISPLAY;
  // FV formula from zero: FV = PMT * ((1+r)^n - 1) / r
  // Solve for n: n = log(1 + FV*r/PMT) / log(1+r)
  if (r === 0) return Math.min(MAX_YEARS_DISPLAY, fireNumber / monthlyContribution / 12);
  const inside = 1 + (fireNumber * r) / monthlyContribution;
  if (inside <= 0) return MAX_YEARS_DISPLAY;
  const months = Math.log(inside) / Math.log(1 + r);
  return Math.min(MAX_YEARS_DISPLAY, months / 12);
}

export function SavingsRateToFireChart({
  walletId,
  from,
  to,
}: SavingsRateToFireChartProps) {
  const { conversionRates, baseCurrency } = useCurrency();
  const [, walletMap] = useWallets();
  const controls = useChartControls();
  const effectiveMonthlySpend = controls?.effectiveMonthlySpend ?? 0;
  const selectedWR = controls?.selectedWR ?? 0.035;
  const assumedRealReturn = controls?.assumedRealReturn ?? 0.04;

  const { data: monthlyStats, isLoading } = useQuery({
    queryKey: ["savings-rate-fire-stats", walletId, from, to, baseCurrency],
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

  const { avgMonthlyIncome, currentSavingsRate } = useMemo(() => {
    if (!monthlyStats || monthlyStats.length === 0) {
      return { avgMonthlyIncome: 0, currentSavingsRate: 0 };
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
    const rate = avgIncome > 0 ? Math.max(0, (avgIncome - avgExpense) / avgIncome) : 0;

    return { avgMonthlyIncome: avgIncome, currentSavingsRate: rate };
  }, [monthlyStats, walletMap, baseCurrency, conversionRates]);

  const { chartData, fireNumber } = useMemo(() => {
    const annualSpend = effectiveMonthlySpend * 12;
    const fn =
      selectedWR > 0 && annualSpend > 0 ? annualSpend / selectedWR : 0;
    const r = assumedRealReturn / 12;

    const closestBucket = SAVINGS_RATE_BUCKETS.reduce((prev, curr) =>
      Math.abs(curr - currentSavingsRate) < Math.abs(prev - currentSavingsRate)
        ? curr
        : prev,
    );

    const data = SAVINGS_RATE_BUCKETS.map((sr) => {
      const monthlyContribution = avgMonthlyIncome * sr;
      const years = computeYearsToFI(fn, monthlyContribution, r);
      return {
        rate: `${(sr * 100).toFixed(0)}%`,
        years: parseFloat(years.toFixed(1)),
        isCurrent: sr === closestBucket,
        savingsRate: sr,
      };
    });

    return { chartData: data, fireNumber: fn };
  }, [
    avgMonthlyIncome,
    effectiveMonthlySpend,
    selectedWR,
    assumedRealReturn,
    currentSavingsRate,
  ]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Rate → Years to FI</CardTitle>
          <CardDescription>
            How many years until financial independence at different savings
            rates, starting from zero.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const currentPct = (currentSavingsRate * 100).toFixed(0);
  const currentYears =
    chartData.find((d) => d.isCurrent)?.years ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings Rate → Years to FI</CardTitle>
        <CardDescription>
          Years to financial independence at each savings rate, compounding at{" "}
          {(assumedRealReturn * 100).toFixed(0)}% real return from zero.
          {avgMonthlyIncome > 0 && (
            <>
              {" "}
              Your current rate is approximately <strong>{currentPct}%</strong>
              {currentYears !== null && currentYears < MAX_YEARS_DISPLAY
                ? ` (~${currentYears.toFixed(1)} years)`
                : ""}
              .
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[220px] w-full">
          <BarChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 4 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="rate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `${v.toFixed(0)}y`}
              domain={[0, MAX_YEARS_DISPLAY]}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof chartData)[0];
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">
                      {d.rate} savings rate
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">
                        {d.years >= MAX_YEARS_DISPLAY
                          ? `${MAX_YEARS_DISPLAY}+`
                          : d.years.toFixed(1)}
                      </span>{" "}
                      years to FI
                    </div>
                    {fireNumber > 0 && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        FIRE number: {formatCurrency(fireNumber, baseCurrency)}
                      </div>
                    )}
                    {d.isCurrent && (
                      <div className="mt-1 text-xs font-medium text-amber-500">
                        Closest to your current rate
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {currentSavingsRate > 0 && (
              <ReferenceLine
                x={`${(Math.round(currentSavingsRate * 10) * 10).toFixed(0)}%`}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `~${currentPct}% now`,
                  position: "top",
                  fontSize: 10,
                  fill: "#f59e0b",
                }}
              />
            )}
            <Bar dataKey="years" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.rate}
                  fill={entry.isCurrent ? "#f59e0b" : "#3b82f6"}
                  fillOpacity={entry.isCurrent ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="text-muted-foreground text-xs">
          Computed from zero portfolio. Higher savings rates reduce years to FI
          more than higher returns at these time horizons.
        </div>
      </CardFooter>
    </Card>
  );
}
