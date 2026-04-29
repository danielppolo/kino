"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { Money } from "@/components/ui/money";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { parseMonthDate } from "@/utils/chart-helpers";
import { ChartColors } from "@/utils/constants";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import {
  getLabelShareTrends,
  LabelShareTrendPoint,
} from "@/utils/supabase/queries";

interface LabelDriftChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

type DriftDataPoint = {
  month: string;
  _amounts: Record<string, number>;
  [key: string]: number | string | Record<string, number>;
};

interface DriftSeries {
  id: string;
  labelId: string | null;
  name: string;
  color: string;
  totalCents: number;
}

const FALLBACK_COLORS = [
  ChartColors.palette.blue,
  ChartColors.palette.teal,
  ChartColors.palette.orange,
  ChartColors.palette.magenta,
  ChartColors.palette.green,
  ChartColors.palette.purple,
  ChartColors.palette.red,
  ChartColors.palette.cyan,
  ChartColors.palette.gray,
];

function buildTransactionsHref({
  walletId,
  labelId,
  from,
  to,
}: {
  walletId?: string;
  labelId?: string | null;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();

  if (labelId) params.set("label_id", labelId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const query = params.toString();
  const basePath = walletId
    ? `/app/transactions/${walletId}`
    : "/app/transactions";

  return query ? `${basePath}?${query}` : basePath;
}

function getMonthsInRange(from?: string, to?: string) {
  if (!from || !to) return [];

  const months: string[] = [];
  const current = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);

  while (current <= end) {
    months.push(current.toISOString().slice(0, 10));
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return months;
}

export function LabelDriftChart({
  walletId,
  from,
  to,
}: LabelDriftChartProps) {
  const [wallets, walletMap] = useWallets();
  const workspaceWalletIds = wallets.map((wallet) => wallet.id);
  const { baseCurrency, conversionRates } = useCurrency();

  const { data, isLoading, error } = useQuery({
    queryKey: ["label-drift", walletId, workspaceWalletIds, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getLabelShareTrends(supabase, {
        walletId,
        workspaceWalletIds,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const drift = useMemo(() => {
    if (!data?.length) {
      return {
        chartData: [] as DriftDataPoint[],
        chartConfig: {} as ChartConfig,
        series: [] as DriftSeries[],
      };
    }

    const explicitMonths = getMonthsInRange(from, to);
    const months = new Set<string>(explicitMonths);
    const labelTotals = new Map<
      string,
      { labelId: string | null; name: string; color: string | null; totalCents: number }
    >();
    const monthLabelTotals = new Map<string, Map<string, number>>();

    data.forEach((point: LabelShareTrendPoint) => {
      const wallet = walletMap.get(point.wallet_id);
      const convertedCents = wallet
        ? convertCurrency(
            point.amount_cents,
            wallet.currency,
            baseCurrency,
            conversionRates,
          )
        : point.amount_cents;

      months.add(point.month);

      const labelKey = point.label_id ?? point.label_name;
      const labelTotal = labelTotals.get(labelKey);

      if (labelTotal) {
        labelTotal.totalCents += convertedCents;
      } else {
        labelTotals.set(labelKey, {
          labelId: point.label_id,
          name: point.label_name,
          color: point.label_color,
          totalCents: convertedCents,
        });
      }

      const monthTotals = monthLabelTotals.get(point.month) ?? new Map<string, number>();
      monthTotals.set(labelKey, (monthTotals.get(labelKey) ?? 0) + convertedCents);
      monthLabelTotals.set(point.month, monthTotals);
    });

    const sortedLabels = Array.from(labelTotals.values()).sort(
      (left, right) => right.totalCents - left.totalCents,
    );
    const primaryLabels = sortedLabels.slice(0, 8);
    const primaryKeys = new Set(
      primaryLabels.map((label) => label.labelId ?? label.name),
    );

    const series: DriftSeries[] = primaryLabels.map((label, index) => ({
      id: label.labelId ?? label.name,
      labelId: label.labelId,
      name: label.name,
      color: label.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
      totalCents: label.totalCents,
    }));

    const otherTotal = sortedLabels
      .slice(8)
      .reduce((sum, label) => sum + label.totalCents, 0);

    if (otherTotal > 0) {
      series.push({
        id: "other",
        labelId: null,
        name: "Other",
        color: ChartColors.palette.gray,
        totalCents: otherTotal,
      });
    }

    const chartData = Array.from(months)
      .sort((left, right) => left.localeCompare(right))
      .map<DriftDataPoint>((month) => {
        const monthAmounts = monthLabelTotals.get(month) ?? new Map<string, number>();
        const totalsBySeries: Record<string, number> = {};

        series.forEach((item) => {
          if (item.id === "other") {
            totalsBySeries.other = Array.from(monthAmounts.entries()).reduce(
              (sum, [labelKey, amount]) =>
                primaryKeys.has(labelKey) ? sum : sum + amount,
              0,
            );
            return;
          }

          totalsBySeries[item.id] = monthAmounts.get(item.id) ?? 0;
        });

        const monthTotal = Object.values(totalsBySeries).reduce(
          (sum, amount) => sum + amount,
          0,
        );

        const dataPoint: DriftDataPoint = {
          month,
          _amounts: totalsBySeries,
        };

        series.forEach((item) => {
          const amount = totalsBySeries[item.id] ?? 0;
          dataPoint[item.id] = monthTotal > 0 ? amount / monthTotal : 0;
        });

        return dataPoint;
      });

    const chartConfig = series.reduce(
      (config, item) => ({
        ...config,
        [item.id]: {
          label: item.name,
          color: item.color,
        },
      }),
      {} as ChartConfig,
    );

    return {
      chartData,
      chartConfig,
      series,
    };
  }, [baseCurrency, conversionRates, data, from, to, walletMap]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Label Drift</CardTitle>
          <CardDescription>
            Monthly share of expense by subjective label in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Label Drift</CardTitle>
          <CardDescription>
            Monthly share of expense by subjective label in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-red-500">
            Error loading chart data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!drift.chartData.length || !drift.series.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Label Drift</CardTitle>
          <CardDescription>
            Monthly share of expense by subjective label in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No label drift data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Label Drift</CardTitle>
        <CardDescription>
          Watch which intentions gain or lose share of your monthly spending in{" "}
          {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ChartContainer config={drift.chartConfig}>
          <BarChart
            data={drift.chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
            stackOffset="expand"
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => format(parseMonthDate(value), "MMM yyyy")}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 1]}
              tickFormatter={(value) => `${Math.round(value * 100)}%`}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length || !label) return null;

                const month = String(label);
                const monthData = drift.chartData.find((item) => item.month === month);
                const amounts = monthData?._amounts ?? {};
                const sortedPayload = [...payload].sort(
                  (left, right) => Number(right.value) - Number(left.value),
                );

                return (
                  <div className="bg-background rounded-lg border p-3 shadow-sm">
                    <div className="space-y-3">
                      <div className="text-sm font-medium">
                        {format(parseMonthDate(month), "MMMM yyyy")}
                      </div>
                      <div className="space-y-3">
                        {sortedPayload.map((entry) => {
                          const series = drift.series.find(
                            (item) => item.id === entry.dataKey,
                          );
                          if (!series) return null;

                          const amountCents = amounts[series.id] ?? 0;
                          const share = Number(entry.value) || 0;

                          return (
                            <div key={series.id} className="space-y-1">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: series.color }}
                                  />
                                  <span className="text-sm font-medium">
                                    {series.name}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {(share * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-sm">
                                <Money
                                  cents={Math.round(amountCents)}
                                  currency={baseCurrency}
                                />
                                {series.name === "Other" ? (
                                  <span className="text-xs text-muted-foreground">
                                    Aggregated
                                  </span>
                                ) : (
                                  <Link
                                    href={buildTransactionsHref({
                                      walletId,
                                      labelId: series.labelId,
                                      from,
                                      to,
                                    })}
                                    className="text-primary underline-offset-4 hover:underline"
                                  >
                                    Open
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            {drift.series.map((series) => (
              <Bar
                key={series.id}
                dataKey={series.id}
                stackId="labels"
                fill={series.color}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ChartContainer>

        <div className="grid gap-2 md:grid-cols-2">
          {drift.series.map((series) =>
            series.name === "Other" ? (
              <div
                key={series.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  <span className="font-medium">{series.name}</span>
                </div>
                <Money cents={series.totalCents} currency={baseCurrency} />
              </div>
            ) : (
              <Link
                key={series.id}
                href={buildTransactionsHref({
                  walletId,
                  labelId: series.labelId,
                  from,
                  to,
                })}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  <span className="font-medium">{series.name}</span>
                </div>
                <Money cents={series.totalCents} currency={baseCurrency} />
              </Link>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
