"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { useQuery } from "@tanstack/react-query";

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
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { parseMonthDate } from "@/utils/chart-helpers";
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
 * The chart emphasizes the exploration share directly instead of stacking both
 * sides of the ratio.
 *
 * The key question: is exploration capacity growing or being crowded out?
 */
export function ExplorationCapitalChart({
  walletId,
  from,
  to,
}: ExplorationCapitalChartProps) {
  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

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
  } =
    useMemo(() => {
      if (!categoryStats || categoryStats.length === 0) {
        return {
          chartData: [],
          chartConfig: {} as ChartConfig,
          topCategoryNames: [],
          variablePct: 0,
          avgVariablePct: 0,
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

      const data = months.map((month, index) => {
        const { baseline, variable } = byMonth[month];
        const total = baseline + variable;
        const variablePct = total > 0 ? (variable / total) * 100 : 0;
        const rollingWindow = months.slice(Math.max(0, index - 2), index + 1);
        const rollingAverage =
          rollingWindow.reduce((sum, currentMonth) => {
            const current = byMonth[currentMonth];
            const currentTotal = current.baseline + current.variable;
            if (currentTotal <= 0) return sum;
            return sum + (current.variable / currentTotal) * 100;
          }, 0) / rollingWindow.length;

        return {
          month,
          baseline: total > 0 ? (baseline / total) * 100 : 0,
          variable: variablePct,
          rollingAverage,
        };
      });

      // Variable % in the last month
      const currentVariablePct =
        data.length > 0 ? data[data.length - 1].variable : 0;
      const currentAvgVariablePct =
        data.length > 0 ? data[data.length - 1].rollingAverage : 0;

      const config: ChartConfig = {
        variable: {
          label: "Exploration capital",
          color: "#3b82f6",
        },
        rollingAverage: {
          label: "3-month average",
          color: "#94a3b8",
        },
      };

      return {
        chartData: data,
        chartConfig: config,
        topCategoryNames,
        variablePct: currentVariablePct,
        avgVariablePct: currentAvgVariablePct,
      };
    }, [categoryStats, conversionRates, baseCurrency, walletMap]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Exploration Capital
          <span
            className="ml-3 text-2xl font-bold"
            style={{ color: explorationColor }}
          >
            {variablePct.toFixed(0)}%
          </span>
        </CardTitle>
        <CardDescription>
          The blue line shows the share of spend that remains discretionary.{" "}
          {topCategoryNames.length > 0 ? (
            <>Required spend is anchored by {topCategoryNames.join(", ")}.</>
          ) : (
            <>Required spend is inferred from your largest recurring categories.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
          >
            <ReferenceArea y1={0} y2={20} fill="#7f1d1d" fillOpacity={0.12} />
            <ReferenceArea y1={20} y2={40} fill="#854d0e" fillOpacity={0.1} />
            <ReferenceArea y1={40} y2={100} fill="#14532d" fillOpacity={0.08} />
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => format(parseMonthDate(v), "MMM yy")}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const variable = payload.find(
                  (p) => p.dataKey === "variable",
                )?.value as number | undefined;
                const rollingAverage = payload.find(
                  (p) => p.dataKey === "rollingAverage",
                )?.value as number | undefined;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="text-sm font-medium mb-1">
                      {format(parseMonthDate(label), "MMMM yyyy")}
                    </div>
                    {variable !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span style={{ color: "#3b82f6" }}>Exploration</span>
                        <span className="font-bold">{variable.toFixed(1)}%</span>
                      </div>
                    )}
                    {rollingAverage !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">
                          3-month average
                        </span>
                        <span>{rollingAverage.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
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
            <Area
              dataKey="variable"
              type="monotone"
              fill="#3b82f6"
              fillOpacity={0.12}
              stroke="none"
            />
            <Line
              dataKey="rollingAverage"
              name="3-month average"
              type="monotone"
              stroke="#94a3b8"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
            <Line
              dataKey="variable"
              name="Exploration capital"
              type="monotone"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6" }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
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
              Avg {avgVariablePct.toFixed(0)}%
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
