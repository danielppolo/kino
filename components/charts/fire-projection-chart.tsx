"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { calculateTrimmedMean, formatCurrency } from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyStats } from "@/utils/supabase/queries";

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

export function FireProjectionChart({
  walletId,
  from,
  to,
}: FireProjectionChartProps) {
  const { totalBalance } = useTotalBalance();
  const { conversionRates, baseCurrency } = useCurrency();
  const [, walletMap] = useWallets();
  const controls = useChartControls();
  const effectiveMonthlySpend = controls?.effectiveMonthlySpend ?? 0;
  const selectedWR = controls?.selectedWR ?? 0.035;
  const assumedRealReturn = controls?.assumedRealReturn ?? 0.04;

  const { data: monthlyStats, isLoading } = useQuery({
    queryKey: ["fire-projection-stats", walletId, from, to, baseCurrency],
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

  const { chartData, fireNumber, fiYear } = useMemo(() => {
    const currentBalance = totalBalance / 100;
    const annualSpend = effectiveMonthlySpend * 12;
    const fn =
      selectedWR > 0 && annualSpend > 0 ? annualSpend / selectedWR : 0;
    const r = assumedRealReturn / 12;
    const stopAfterFIMonths = 36; // show 3 years past FI date

    const data: Array<{ year: number; balance: number }> = [];
    let balance = currentBalance;
    let fiYear: number | null = null;
    let monthsPastFI = 0;

    for (let m = 0; m <= MAX_PROJECTION_YEARS * 12; m++) {
      // Sample yearly (plus month 0)
      if (m % 12 === 0) {
        data.push({ year: m / 12, balance: Math.max(0, balance) });
      }

      if (fn > 0 && balance >= fn && fiYear === null) {
        fiYear = m / 12;
      }
      if (fiYear !== null) {
        monthsPastFI++;
        if (monthsPastFI > stopAfterFIMonths) break;
      }

      balance = balance * (1 + r) + netMonthlySavings;
    }

    return { chartData: data, fireNumber: fn, fiYear };
  }, [
    totalBalance,
    effectiveMonthlySpend,
    selectedWR,
    assumedRealReturn,
    netMonthlySavings,
  ]);

  const yAxisFormatter = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
    return v.toFixed(0);
  };

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
          {(assumedRealReturn * 100).toFixed(0)}% real return and{" "}
          {formatCurrency(netMonthlySavings, baseCurrency)}/mo net savings,
          targeting{" "}
          {fireNumber > 0
            ? formatCurrency(fireNumber, baseCurrency)
            : "—"}{" "}
          ({(selectedWR * 100).toFixed(1)}% WR).
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
                const d = payload[0].payload as { year: number; balance: number };
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">
                      Year {d.year}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">
                        {formatCurrency(d.balance, baseCurrency)}
                      </span>
                    </div>
                    {fireNumber > 0 && (
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
