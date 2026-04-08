"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { useChartControls } from "@/components/charts/shared/chart-controls-context";
import { useFirePlanData } from "@/components/charts/shared/use-fire-plan-data";
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
  computeDownshiftTarget,
  computeFireTarget,
  computeMonthsToTarget,
} from "@/utils/fire-plan";

interface SavingsRateToFireChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const SAVINGS_RATE_BUCKETS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
const MAX_YEARS_DISPLAY = 50;

const chartConfig: ChartConfig = {
  downshiftYears: {
    label: "Years to downshift",
    color: "#f59e0b",
  },
  fullYears: {
    label: "Years to full FIRE",
    color: "#3b82f6",
  },
};

function normalizeYears(months: number | null) {
  if (months == null) return MAX_YEARS_DISPLAY;
  return Math.min(MAX_YEARS_DISPLAY, Number((months / 12).toFixed(1)));
}

export function SavingsRateToFireChart({
  walletId,
  from,
  to,
}: SavingsRateToFireChartProps) {
  const controls = useChartControls();
  const assumedRealReturn = controls?.assumedRealReturn ?? 0.04;

  const {
    averageMonthlyIncome,
    baseCurrency,
    contextualAssetValue,
    currentSavingsRate,
    effectiveMonthlySpend,
    hasContextualAssets,
    investableBalance,
    isLoading,
    targetLowerMonthlyIncome,
  } = useFirePlanData({
    walletId,
    from,
    to,
  });

  const chartData = useMemo(() => {
    const closestBucket = SAVINGS_RATE_BUCKETS.reduce((previous, current) =>
      Math.abs(current - currentSavingsRate) < Math.abs(previous - currentSavingsRate)
        ? current
        : previous,
    );

    return SAVINGS_RATE_BUCKETS.map((savingsRate) => {
      const monthlyContribution = averageMonthlyIncome * savingsRate;
      const fullTarget = computeFireTarget(
        effectiveMonthlySpend,
        controls?.selectedWR ?? 0.035,
      );
      const downshiftTarget = computeDownshiftTarget(
        effectiveMonthlySpend,
        targetLowerMonthlyIncome,
        controls?.selectedWR ?? 0.035,
      );

      return {
        downshiftYears: normalizeYears(
          computeMonthsToTarget({
            currentBalance: investableBalance,
            targetBalance: downshiftTarget,
            monthlyContribution,
            annualRealReturn: assumedRealReturn,
          }),
        ),
        fullYears: normalizeYears(
          computeMonthsToTarget({
            currentBalance: investableBalance,
            targetBalance: fullTarget,
            monthlyContribution,
            annualRealReturn: assumedRealReturn,
          }),
        ),
        isCurrent: savingsRate === closestBucket,
        rate: `${(savingsRate * 100).toFixed(0)}%`,
        savingsRate,
      };
    });
  }, [
    assumedRealReturn,
    averageMonthlyIncome,
    controls?.selectedWR,
    currentSavingsRate,
    effectiveMonthlySpend,
    investableBalance,
    targetLowerMonthlyIncome,
  ]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Rate → Escape Timing</CardTitle>
          <CardDescription>
            How different savings rates change downshift and full FIRE timing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const currentPct = (currentSavingsRate * 100).toFixed(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings Rate → Escape Timing</CardTitle>
        <CardDescription>
          Years from your current investable portfolio, not from zero. Bars compare
          downshift timing against full FIRE timing at different savings rates.
          {averageMonthlyIncome > 0 && (
            <>
              {" "}
              Your current savings rate is approximately{" "}
              <strong>{currentPct}%</strong>.
            </>
          )}
          {hasContextualAssets && (
            <>
              {" "}
              Tracked assets (
              <strong>{formatCurrency(contextualAssetValue, baseCurrency)}</strong>)
              are excluded from the bars and treated as fallback capital.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[240px] w-full">
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
              tickFormatter={(value) => `${value.toFixed(0)}y`}
              domain={[0, MAX_YEARS_DISPLAY]}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload as (typeof chartData)[0];

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">
                      {data.rate} savings rate
                    </div>
                    <div className="text-xs">
                      Downshift:{" "}
                      <span className="font-medium">
                        {data.downshiftYears >= MAX_YEARS_DISPLAY
                          ? `${MAX_YEARS_DISPLAY}+ years`
                          : `${data.downshiftYears.toFixed(1)} years`}
                      </span>
                    </div>
                    <div className="text-xs">
                      Full FIRE:{" "}
                      <span className="font-medium">
                        {data.fullYears >= MAX_YEARS_DISPLAY
                          ? `${MAX_YEARS_DISPLAY}+ years`
                          : `${data.fullYears.toFixed(1)} years`}
                      </span>
                    </div>
                    {data.isCurrent && (
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
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: `~${currentPct}% now`,
                  position: "top",
                  fontSize: 10,
                  fill: "#94a3b8",
                }}
              />
            )}
            <Bar
              dataKey="downshiftYears"
              name="Years to downshift"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="fullYears"
              name="Years to full FIRE"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="text-muted-foreground text-xs">
          Higher savings rates shorten both timelines, but downshift readiness
          should arrive earlier whenever lower-income work covers part of the gap.
        </div>
      </CardFooter>
    </Card>
  );
}
