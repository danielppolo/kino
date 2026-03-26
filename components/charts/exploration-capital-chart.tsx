"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
 * Shows monthly spending split between:
 * - "Baseline" — the top 3 categories by total cumulative spend (structural obligations)
 * - "Variable" — everything else (exploration capital)
 *
 * The key question: is the variable/exploration fraction growing or being crowded out?
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

  const { chartData, chartConfig, topCategoryNames, variablePct } =
    useMemo(() => {
      if (!categoryStats || categoryStats.length === 0) {
        return {
          chartData: [],
          chartConfig: {} as ChartConfig,
          topCategoryNames: [],
          variablePct: 0,
        };
      }

      // Aggregate total spend per category across all months
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

      // Identify top 3 categories by total spend — these are the "baseline"
      const sorted = Object.entries(categoryTotals).sort(
        ([, a], [, b]) => b.total - a.total,
      );
      const topN = 3;
      const baselineIds = new Set(sorted.slice(0, topN).map(([id]) => id));
      const topCategoryNames = sorted
        .slice(0, topN)
        .map(([, v]) => v.name);

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

      const data = months.map((month) => {
        const { baseline, variable } = byMonth[month];
        const total = baseline + variable;
        return {
          month,
          baseline: total > 0 ? (baseline / total) * 100 : 0,
          variable: total > 0 ? (variable / total) * 100 : 0,
        };
      });

      // Variable % in the last month
      const currentVariablePct =
        data.length > 0 ? data[data.length - 1].variable : 0;

      const config: ChartConfig = {
        baseline: {
          label: "Baseline obligations",
          color: "#6b7280",
        },
        variable: {
          label: "Exploration capital",
          color: "#3b82f6",
        },
      };

      return {
        chartData: data,
        chartConfig: config,
        topCategoryNames,
        variablePct: currentVariablePct,
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
          <CardDescription>Discretionary spend as % of total</CardDescription>
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
          <CardDescription>Discretionary spend as % of total</CardDescription>
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
          Discretionary spend fraction — baseline: {topCategoryNames.join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            stackOffset="expand"
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
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const baseline = payload.find(
                  (p) => p.dataKey === "baseline",
                )?.value as number | undefined;
                const variable = payload.find(
                  (p) => p.dataKey === "variable",
                )?.value as number | undefined;
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="text-sm font-medium mb-1">
                      {format(parseMonthDate(label), "MMMM yyyy")}
                    </div>
                    {baseline !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">Baseline</span>
                        <span>{baseline.toFixed(1)}%</span>
                      </div>
                    )}
                    {variable !== undefined && (
                      <div className="flex justify-between gap-4 text-sm">
                        <span style={{ color: "#3b82f6" }}>Exploration</span>
                        <span className="font-bold">{variable.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Area
              dataKey="baseline"
              name="Baseline obligations"
              type="monotone"
              fill="#6b7280"
              fillOpacity={0.3}
              stroke="#6b7280"
              stackId="1"
            />
            <Area
              dataKey="variable"
              name="Exploration capital"
              type="monotone"
              fill="#3b82f6"
              fillOpacity={0.3}
              stroke="#3b82f6"
              stackId="1"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <TrendingIndicator
          percentageChange={percentageChange}
          startDate={chartData[0]?.month}
          endDate={chartData[chartData.length - 1]?.month}
        />
      </CardFooter>
    </Card>
  );
}
