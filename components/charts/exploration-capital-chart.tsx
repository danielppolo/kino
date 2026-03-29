"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Area, CartesianGrid, ComposedChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { useQuery } from "@tanstack/react-query";

import { useChartControls } from "./shared/chart-controls-context";

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
import { Money } from "@/components/ui/money";
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { capChartOutliers, formatCurrency, parseMonthDate } from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyCategoryStats } from "@/utils/supabase/queries";

interface ExplorationCapitalChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

/**
 * Shows how much of spending remains discretionary after required categories.
 * The chart uses smoothed exploration trendlines so the signal stays legible.
 *
 * The key question: is exploration capacity growing or being crowded out?
 */
export function ExplorationCapitalChart({
  walletId,
  from,
  to,
}: ExplorationCapitalChartProps) {
  const controls = useChartControls();
  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();
  const chartValueMode = controls?.chartValueMode ?? "percentage";
  const peakNormalizationPercentile = controls?.peakNormalizationPercentile ?? 0.97;

  const { data: categoryStats, isLoading } = useQuery({
    queryKey: ["exploration-capital-stats", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyCategoryStats(supabase, {
        walletId,
        from,
        to,
        type: "expense",
      });
      if (error) throw error;
      return data;
    },
  });

  const {
    chartData,
    chartConfig,
    topCategoryNames,
    variablePct,
    avgVariablePct,
    variableAmount,
    avgVariableAmount,
    avgBaselinePct,
    avgBaselineAmount,
    avgTotalAmount,
  } =
    useMemo(() => {
      if (!categoryStats || categoryStats.length === 0) {
        return {
          chartData: [],
          chartConfig: {} as ChartConfig,
          topCategoryNames: [],
          variablePct: 0,
          avgVariablePct: 0,
          variableAmount: 0,
          avgVariableAmount: 0,
          avgBaselinePct: 0,
          avgBaselineAmount: 0,
          avgTotalAmount: 0,
        };
      }

      // Prefer explicit obligation metadata. Fall back to the historical
      // top-spend heuristic until categories are classified.
      const explicitObligationIds = new Set(
        categoryStats
          .filter((s) => s.categories?.is_obligation)
          .map((s) => s.category_id)
          .filter(Boolean),
      );

      // Aggregate total spend per category across all months for fallback
      const categoryTotals: Record<string, { name: string; total: number }> =
        {};
      categoryStats.forEach((s) => {
        const cid = s.category_id;
        if (!cid) return;
        const wallet = walletMap.get(s.wallet_id ?? "");
        const currency = wallet?.currency ?? baseCurrency;
        const expense =
          Math.abs(
            convertCurrency(
              s.outcome_cents,
              currency,
              baseCurrency,
              conversionRates,
            ),
          ) / 100;
        if (!categoryTotals[cid]) {
          categoryTotals[cid] = {
            name: s.categories?.name ?? cid,
            total: 0,
          };
        }
        categoryTotals[cid].total += expense;
      });

      const sorted = Object.entries(categoryTotals).sort(
        ([, a], [, b]) => b.total - a.total,
      );
      const fallbackTopN = 3;
      const fallbackIds = new Set(
        sorted.slice(0, fallbackTopN).map(([id]) => id),
      );
      const baselineIds =
        explicitObligationIds.size > 0 ? explicitObligationIds : fallbackIds;
      const topCategoryNames =
        explicitObligationIds.size > 0
          ? sorted
              .filter(([id]) => baselineIds.has(id))
              .map(([, value]) => value.name)
          : sorted.slice(0, fallbackTopN).map(([, value]) => value.name);

      // Group by month
      const byMonth: Record<
        string,
        { baseline: number; variable: number }
      > = {};
      categoryStats.forEach((s) => {
        if (!byMonth[s.month]) byMonth[s.month] = { baseline: 0, variable: 0 };
        const wallet = walletMap.get(s.wallet_id ?? "");
        const currency = wallet?.currency ?? baseCurrency;
        const expense =
          Math.abs(
            convertCurrency(
              s.outcome_cents,
              currency,
              baseCurrency,
              conversionRates,
            ),
          ) / 100;
        if (baselineIds.has(s.category_id ?? "")) {
          byMonth[s.month].baseline += expense;
        } else {
          byMonth[s.month].variable += expense;
        }
      });

      const months = Object.keys(byMonth).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      );

      const rawData = months.map((month, index) => {
        const { baseline, variable } = byMonth[month];
        const total = baseline + variable;
        const variablePctRaw = total > 0 ? (variable / total) * 100 : 0;
        const trendWindow = months.slice(Math.max(0, index - 4), index + 1);
        const trendWeights = trendWindow.map((_, windowIndex) => windowIndex + 1);
        const smoothedVariablePct =
          trendWindow.reduce((sum, currentMonth, windowIndex) => {
            const current = byMonth[currentMonth];
            const currentTotal = current.baseline + current.variable;
            if (currentTotal <= 0) return sum;
            return (
              sum +
              ((current.variable / currentTotal) * 100) *
                trendWeights[windowIndex]
            );
          }, 0) / trendWeights.reduce((sum, weight) => sum + weight, 0);
        const rollingWindow = months.slice(Math.max(0, index - 5), index + 1);
        const rollingAverage =
          rollingWindow.reduce((sum, currentMonth) => {
            const current = byMonth[currentMonth];
            const currentTotal = current.baseline + current.variable;
            if (currentTotal <= 0) return sum;
            return sum + (current.variable / currentTotal) * 100;
          }, 0) / rollingWindow.length;
        const rollingAbsolute =
          rollingWindow.reduce((sum, currentMonth) => {
            const current = byMonth[currentMonth];
            return sum + current.variable;
          }, 0) / rollingWindow.length;

        return {
          month,
          baseline: 100 - smoothedVariablePct,
          variable: smoothedVariablePct,
          rawVariable: variablePctRaw,
          rollingAverage,
          baselineAmount: baseline,
          variableAmount: variable,
          rawVariableAmount: variable,
          rollingAbsolute,
        };
      });

      // Variable % in the last month
      const currentVariablePct =
        rawData.length > 0 ? rawData[rawData.length - 1].variable : 0;
      const currentAvgVariablePct =
        rawData.length > 0 ? rawData[rawData.length - 1].rollingAverage : 0;
      const currentVariableAmount =
        rawData.length > 0 ? rawData[rawData.length - 1].variableAmount : 0;
      const currentAvgVariableAmount =
        rawData.length > 0 ? rawData[rawData.length - 1].rollingAbsolute : 0;
      const averageBaselinePct =
        rawData.length > 0
          ? rawData.reduce((sum, point) => sum + point.baseline, 0) /
            rawData.length
          : 0;
      const averageBaselineAmount =
        rawData.length > 0
          ? rawData.reduce((sum, point) => sum + point.baselineAmount, 0) /
            rawData.length
          : 0;
      const averageTotalAmount =
        rawData.length > 0
          ? rawData.reduce(
              (sum, point) => sum + point.baselineAmount + point.variableAmount,
              0,
            ) / rawData.length
          : 0;

      const absoluteCapped = capChartOutliers(
        rawData,
        ["baselineAmount", "variableAmount"] as const,
        peakNormalizationPercentile,
      );
      const chartData = rawData.map((point, index) => {
        const cappedPoint = absoluteCapped.data[index];
        return {
          ...point,
          cappedBaselineAmount: cappedPoint?.baselineAmount ?? point.baselineAmount,
          cappedVariableAmount: cappedPoint?.variableAmount ?? point.variableAmount,
          _absoluteOriginal: cappedPoint?._original ?? {},
        };
      });

      const config: ChartConfig = {
        variable: {
          label: "Exploration capital",
          color: "#3b82f6",
        },
        baseline: {
          label: "Required spend",
          color: "#3f3f46",
        },
      };

      return {
        chartData,
        chartConfig: config,
        topCategoryNames,
        variablePct: currentVariablePct,
        avgVariablePct: currentAvgVariablePct,
        variableAmount: currentVariableAmount,
        avgVariableAmount: currentAvgVariableAmount,
        avgBaselinePct: averageBaselinePct,
        avgBaselineAmount: averageBaselineAmount,
        avgTotalAmount: averageTotalAmount,
      };
    }, [
      categoryStats,
      conversionRates,
      baseCurrency,
      walletMap,
      peakNormalizationPercentile,
    ]);

  const percentageChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const prev = chartData[chartData.length - 2].variable;
    const curr = chartData[chartData.length - 1].variable;
    if (prev === 0) return 0;
    return ((curr - prev) / prev) * 100;
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exploration Capital</CardTitle>
          <CardDescription>
            Shows how much of your spending is still flexible after baseline
            obligations take their share.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exploration Capital</CardTitle>
          <CardDescription>
            Shows how much of your spending is still flexible after baseline
            obligations take their share.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No data available for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  const explorationColor =
    variablePct >= 40 ? "#22c55e" : variablePct >= 20 ? "#f59e0b" : "#ef4444";
  const statusLabel =
    variablePct >= 40 ? "Healthy room" : variablePct >= 20 ? "Tight" : "Constrained";
  const headlineValue =
    chartValueMode === "percentage" ? (
      `${variablePct.toFixed(0)}%`
    ) : (
      <Money
        cents={Math.round(variableAmount * 100)}
        currency={baseCurrency}
        className="font-bold"
      />
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Exploration Capital
          <span
            className="ml-3 text-2xl font-bold"
            style={{ color: explorationColor }}
          >
            {headlineValue}
          </span>
        </CardTitle>
        <CardDescription>
          {chartValueMode === "percentage"
            ? "The stacked areas show your smoothed discretionary share on top of required spend. "
            : "The stacked areas show your monthly discretionary amount on top of required spend. Extreme peaks are normalized using the global chart cap control. "}
          {topCategoryNames.length > 0 ? (
            <>Required spend is anchored by {topCategoryNames.join(", ")}.</>
          ) : (
            <>Required spend is inferred from your largest recurring categories.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ComposedChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => format(parseMonthDate(v), "MMM yy")}
            />
            <YAxis
              domain={[0, "auto"]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) =>
                chartValueMode === "percentage"
                  ? `${v.toFixed(0)}%`
                  : formatCurrency(v, baseCurrency)
              }
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const variable = payload.find(
                  (p) =>
                    p.dataKey ===
                    (chartValueMode === "percentage" ? "variable" : "variableAmount"),
                )?.value as number | undefined;
                const rawVariable = payload.find(
                  (p) =>
                    p.dataKey ===
                    (chartValueMode === "percentage" ? "rawVariable" : "rawVariableAmount"),
                )?.value as number | undefined;
                const rollingAverage = payload.find(
                  (p) =>
                    p.dataKey ===
                    (chartValueMode === "percentage" ? "rollingAverage" : "rollingAbsolute"),
                )?.value as number | undefined;
                const baseline = payload.find(
                  (p) =>
                    p.dataKey ===
                    (chartValueMode === "percentage"
                      ? "baseline"
                      : "cappedBaselineAmount"),
                )?.value as number | undefined;
                const dataPoint = chartData.find((point) => point.month === label);
                const absoluteOriginal = dataPoint?._absoluteOriginal || {};
                const rawBaselineAmount =
                  typeof absoluteOriginal.baselineAmount === "number"
                    ? absoluteOriginal.baselineAmount
                    : baseline;
                const rawVariableAmount =
                  typeof absoluteOriginal.variableAmount === "number"
                    ? absoluteOriginal.variableAmount
                    : variable;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="text-sm font-medium mb-1">
                      {format(parseMonthDate(label), "MMMM yyyy")}
                    </div>
                    {variable !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span style={{ color: "#3b82f6" }}>Exploration</span>
                        <span className="font-bold">
                          {chartValueMode === "percentage"
                            ? `${variable.toFixed(1)}%`
                            : formatCurrency(rawVariableAmount ?? variable, baseCurrency)}
                        </span>
                      </div>
                    )}
                    {rawVariable !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">Raw month</span>
                        <span>
                          {chartValueMode === "percentage"
                            ? `${rawVariable.toFixed(1)}%`
                            : formatCurrency(rawVariable, baseCurrency)}
                        </span>
                      </div>
                    )}
                    {rollingAverage !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">
                          6-month average
                        </span>
                        <span>
                          {chartValueMode === "percentage"
                            ? `${rollingAverage.toFixed(1)}%`
                            : formatCurrency(rollingAverage, baseCurrency)}
                        </span>
                      </div>
                    )}
                    {baseline !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">Required</span>
                        <span>
                          {chartValueMode === "percentage"
                            ? `${baseline.toFixed(1)}%`
                            : formatCurrency(rawBaselineAmount ?? baseline, baseCurrency)}
                        </span>
                      </div>
                    )}
                    {chartValueMode === "absolute" &&
                      rawVariableAmount !== undefined &&
                      variable !== undefined &&
                      rawVariableAmount > variable && (
                        <div className="text-muted-foreground pt-1 text-xs">
                          Chart view capped for readability.
                        </div>
                      )}
                  </div>
                );
              }}
            />
            {chartValueMode === "percentage" && (
              <>
                <ReferenceLine
                  y={20}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
                <ReferenceLine
                  y={40}
                  stroke="#22c55e"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
                <ReferenceLine
                  y={60}
                  stroke="#60a5fa"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                />
                <ReferenceLine
                  y={avgBaselinePct}
                  stroke="#a1a1aa"
                  strokeDasharray="6 4"
                  strokeOpacity={0.8}
                />
              </>
            )}
            {chartValueMode === "absolute" && (
              <>
                <ReferenceLine
                  y={avgBaselineAmount}
                  stroke="#a1a1aa"
                  strokeDasharray="6 4"
                  strokeOpacity={0.8}
                />
                <ReferenceLine
                  y={avgTotalAmount}
                  stroke="#60a5fa"
                  strokeDasharray="6 4"
                  strokeOpacity={0.45}
                />
              </>
            )}
            <Area
              dataKey={
                chartValueMode === "percentage"
                  ? "baseline"
                  : "cappedBaselineAmount"
              }
              name="Required spend"
              type="monotone"
              fill="#3f3f46"
              fillOpacity={0.55}
              stroke="none"
              stackId="capacity"
            />
            <Area
              dataKey={
                chartValueMode === "percentage"
                  ? "variable"
                  : "cappedVariableAmount"
              }
              name="Exploration capital"
              type="monotone"
              fill="#1d4ed8"
              fillOpacity={0.18}
              stroke="none"
              stackId="capacity"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center justify-between gap-4">
          <TrendingIndicator
            percentageChange={percentageChange}
            startDate={chartData[0]?.month}
            endDate={chartData[chartData.length - 1]?.month}
          />
            <div className="text-right">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">
                Current zone
              </div>
              <div className="font-medium" style={{ color: explorationColor }}>
                {statusLabel}
              </div>
              <div className="text-muted-foreground text-xs">
                Avg{" "}
                {chartValueMode === "percentage"
                  ? `${avgVariablePct.toFixed(0)}%`
                  : formatCurrency(avgVariableAmount, baseCurrency)}
              </div>
              <div className="text-muted-foreground text-xs">
                Required avg{" "}
                {chartValueMode === "percentage"
                  ? `${avgBaselinePct.toFixed(0)}%`
                  : formatCurrency(avgBaselineAmount, baseCurrency)}
              </div>
            </div>
          </div>
      </CardFooter>
    </Card>
  );
}
