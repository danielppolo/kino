"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { ChartSkeleton } from "@/components/charts/shared/chart-skeleton";
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
import { useChartControls } from "@/components/charts/shared/chart-controls-context";
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import {
  capChartOutliers,
  calculateTrimmedMean,
  parseMonthDate,
} from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyStats } from "@/utils/supabase/queries";

interface FreedomMultiplierChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

const chartConfig: ChartConfig = {
  multiplier: {
    label: "Monthly Leverage",
    color: "#3b82f6",
  },
  rolling: {
    label: "3-Month Avg",
    color: "#f59e0b",
  },
};
const HEADLINE_LOOKBACK_MONTHS = 3;

export function FreedomMultiplierChart({
  walletId,
  from,
  to,
}: FreedomMultiplierChartProps) {
  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();
  const controls = useChartControls();
  const normalizationPercentile = controls?.peakNormalizationPercentile ?? 0.97;

  const { data: monthlyStats, isLoading } = useQuery({
    queryKey: ["freedom-multiplier-stats", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyStats(supabase, {
        walletId,
        from,
        to,
      });
      if (error) throw error;
      return data;
    },
  });

  const { chartData, headlineMultiplier, headlineWindowMonths } =
    useMemo(() => {
      if (!monthlyStats || monthlyStats.length === 0) {
        return {
          chartData: [],
          headlineMultiplier: 0,
          headlineWindowMonths: [] as string[],
        };
      }

      // Group by month and convert to base currency
      const byMonth: Record<string, { income: number; expense: number }> = {};
      monthlyStats.forEach((s) => {
        if (!byMonth[s.month]) byMonth[s.month] = { income: 0, expense: 0 };
        const wallet = walletMap.get(s.wallet_id ?? "");
        const currency = wallet?.currency ?? baseCurrency;
        const income =
          convertCurrency(
            s.income_cents,
            currency,
            baseCurrency,
            conversionRates,
          ) / 100;
        const expense =
          Math.abs(
            convertCurrency(
              s.outcome_cents,
              currency,
              baseCurrency,
              conversionRates,
            ),
          ) / 100;
        byMonth[s.month].income += income;
        byMonth[s.month].expense += expense;
      });

      const months = Object.keys(byMonth).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      );

      // Annualized burn = trimmed mean of monthly expenses × 12, but we use monthly avg burn
      const allExpenses = months
        .map((m) => byMonth[m].expense)
        .filter((e) => e > 0);
      const avgBurn = calculateTrimmedMean(allExpenses);
      if (avgBurn === 0) return { chartData: [], currentMultiplier: 0 };

      // Compute multiplier per month: net savings / avg monthly burn
      const raw = months.map((month) => {
        const { income, expense } = byMonth[month];
        const netSavings = income - expense;
        return {
          month,
          multiplier: netSavings / avgBurn,
        };
      });

      // Add 3-month rolling average
      const data = raw.map((point, i) => {
        const window = raw.slice(Math.max(0, i - 2), i + 1);
        const avg =
          window.reduce((sum, p) => sum + p.multiplier, 0) / window.length;
        return { ...point, rolling: avg };
      });

      const currentMonthKey = format(new Date(), "yyyy-MM-01");
      const completedMonths = data.filter(
        (point) => point.month < currentMonthKey,
      );
      const headlineWindow = completedMonths.slice(-HEADLINE_LOOKBACK_MONTHS);
      const fallbackWindow =
        headlineWindow.length > 0
          ? headlineWindow
          : data.slice(-Math.min(HEADLINE_LOOKBACK_MONTHS, data.length));
      const headlineAverage =
        fallbackWindow.length > 0
          ? fallbackWindow.reduce((sum, point) => sum + point.multiplier, 0) /
            fallbackWindow.length
          : 0;
      const { data: cappedData } = capChartOutliers(
        data,
        ["multiplier", "rolling"],
        normalizationPercentile,
      );

      return {
        chartData: cappedData,
        headlineMultiplier: headlineAverage,
        headlineWindowMonths: fallbackWindow.map((point) => point.month),
      };
    }, [
      monthlyStats,
      conversionRates,
      baseCurrency,
      walletMap,
      normalizationPercentile,
    ]);

  const percentageChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const prevPoint = chartData[chartData.length - 2] as {
      multiplier: number;
      _original?: { multiplier?: number };
    };
    const currPoint = chartData[chartData.length - 1] as {
      multiplier: number;
      _original?: { multiplier?: number };
    };
    const prev = prevPoint._original?.multiplier ?? prevPoint.multiplier;
    const curr = currPoint._original?.multiplier ?? currPoint.multiplier;
    if (prev === 0) return 0;
    return ((curr - prev) / Math.abs(prev)) * 100;
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Freedom Multiplier</CardTitle>
          <CardDescription>
            Measures how many months of autonomy each month of work is buying
            after covering your average burn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Freedom Multiplier</CardTitle>
          <CardDescription>
            Measures how many months of autonomy each month of work is buying
            after covering your average burn.
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

  const multiplierColor =
    headlineMultiplier >= 2
      ? "#22c55e"
      : headlineMultiplier >= 1
        ? "#f59e0b"
        : "#ef4444";

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Freedom Multiplier
          <span
            className="ml-3 text-2xl font-bold"
            style={{ color: multiplierColor }}
          >
            {headlineMultiplier.toFixed(1)}×
          </span>
        </CardTitle>
        <CardDescription>
          Averaged across{" "}
          <strong>
            {headlineWindowMonths.length || HEADLINE_LOOKBACK_MONTHS}
          </strong>{" "}
          recent completed{" "}
          {headlineWindowMonths.length === 1 ? "month" : "months"}, each month
          of income bought{" "}
          <strong>{Math.max(0, headlineMultiplier).toFixed(1)}</strong> months
          of future autonomy after covering average burn. That left leverage{" "}
          {headlineMultiplier >= 1 ? "above" : "below"} break-even.
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
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `${v.toFixed(1)}×`}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as
                  | {
                      _original?: {
                        multiplier?: number;
                        rolling?: number;
                      };
                    }
                  | undefined;
                const mult =
                  point?._original?.multiplier ??
                  (payload.find((p) => p.dataKey === "multiplier")?.value as
                    | number
                    | undefined);
                const roll =
                  point?._original?.rolling ??
                  (payload.find((p) => p.dataKey === "rolling")?.value as
                    | number
                    | undefined);
                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">
                      {format(parseMonthDate(label), "MMMM yyyy")}
                    </div>
                    {mult !== undefined && (
                      <div className="text-sm">
                        Leverage:{" "}
                        <span className="font-bold">{mult.toFixed(2)}×</span>
                      </div>
                    )}
                    {roll !== undefined && (
                      <div className="text-muted-foreground text-sm">
                        3-month avg: {roll.toFixed(2)}×
                      </div>
                    )}
                  </div>
                );
              }}
            />
            {/* Break-even line */}
            <ReferenceLine
              y={1}
              stroke="#6b7280"
              strokeDasharray="4 4"
              label={{
                value: "break-even",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#6b7280",
              }}
            />
            <Bar
              dataKey="multiplier"
              name="Monthly Leverage"
              fill="#3b82f6"
              fillOpacity={0.7}
              radius={[2, 2, 0, 0]}
            />
            <Line
              dataKey="rolling"
              name="3-Month Avg"
              type="monotone"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
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
