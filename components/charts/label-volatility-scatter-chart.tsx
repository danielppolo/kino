"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Cell,
  CartesianGrid,
  Scatter,
  ScatterChart,
  TooltipProps,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { useQuery } from "@tanstack/react-query";

import { ChartSkeleton } from "@/components/charts/shared/chart-skeleton";
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
import { formatCurrency } from "@/utils/chart-helpers";
import { ChartColors } from "@/utils/constants";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import {
  getLabelVolatilityData,
  LabelVolatilityPoint,
} from "@/utils/supabase/queries";

interface LabelVolatilityScatterChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface ScatterPoint {
  id: string;
  labelId: string | null;
  name: string;
  color: string;
  totalAmount: number;
  volatility: number;
  totalAmountCents: number;
  volatilityCents: number;
  transactionCount: number;
  fill: string;
}

const FALLBACK_COLORS = [
  ChartColors.palette.blue,
  ChartColors.palette.teal,
  ChartColors.palette.magenta,
  ChartColors.palette.orange,
  ChartColors.palette.green,
  ChartColors.palette.purple,
  ChartColors.palette.red,
  ChartColors.palette.cyan,
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

function standardDeviation(values: number[]) {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function LabelVolatilityScatterChart({
  walletId,
  from,
  to,
}: LabelVolatilityScatterChartProps) {
  const [wallets, walletMap] = useWallets();
  const workspaceWalletIds = wallets.map((wallet) => wallet.id);
  const { baseCurrency, conversionRates } = useCurrency();

  const { data, isLoading, error } = useQuery({
    queryKey: ["label-volatility", walletId, workspaceWalletIds, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getLabelVolatilityData(supabase, {
        walletId,
        workspaceWalletIds,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const scatterData = useMemo(() => {
    if (!data?.length) return [] as ScatterPoint[];

    const explicitMonths = getMonthsInRange(from, to);
    const inferredMonths = new Set<string>();
    const grouped = new Map<
      string,
      {
        labelId: string | null;
        name: string;
        color: string | null;
        totalAmountCents: number;
        transactionCount: number;
        monthlyAmountCents: Map<string, number>;
      }
    >();

    data.forEach((point: LabelVolatilityPoint) => {
      const wallet = walletMap.get(point.wallet_id);
      const convertedCents = wallet
        ? convertCurrency(
            point.amount_cents,
            wallet.currency,
            baseCurrency,
            conversionRates,
          )
        : point.amount_cents;

      inferredMonths.add(point.month);

      const key = point.label_id ?? point.label_name;
      const existing = grouped.get(key);

      if (existing) {
        existing.totalAmountCents += convertedCents;
        existing.transactionCount += point.transaction_count;
        existing.monthlyAmountCents.set(
          point.month,
          (existing.monthlyAmountCents.get(point.month) ?? 0) + convertedCents,
        );
        return;
      }

      grouped.set(key, {
        labelId: point.label_id,
        name: point.label_name,
        color: point.label_color,
        totalAmountCents: convertedCents,
        transactionCount: point.transaction_count,
        monthlyAmountCents: new Map([[point.month, convertedCents]]),
      });
    });

    const months =
      explicitMonths.length > 0
        ? explicitMonths
        : Array.from(inferredMonths).sort((left, right) =>
            left.localeCompare(right),
          );

    return Array.from(grouped.values())
      .map((item, index) => {
        const monthlySeries = months.map(
          (month) => item.monthlyAmountCents.get(month) ?? 0,
        );
        const volatilityCents = standardDeviation(monthlySeries);

        return {
          id: item.labelId ?? item.name,
          labelId: item.labelId,
          name: item.name,
          color: item.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
          totalAmount: item.totalAmountCents / 100,
          volatility: volatilityCents / 100,
          totalAmountCents: item.totalAmountCents,
          volatilityCents,
          transactionCount: item.transactionCount,
          fill: item.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        };
      })
      .sort((left, right) => right.volatilityCents - left.volatilityCents);
  }, [baseCurrency, conversionRates, data, from, to, walletMap]);

  const chartConfig = useMemo(
    () =>
      scatterData.reduce(
        (config, point) => ({
          ...config,
          [point.id]: {
            label: point.name,
            color: point.color,
          },
        }),
        {} as ChartConfig,
      ),
    [scatterData],
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Label Volatility Scatter</CardTitle>
          <CardDescription>
            Labels sized by frequency and positioned by spend vs volatility in{" "}
            {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSkeleton variant="scatter" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Label Volatility Scatter</CardTitle>
          <CardDescription>
            Labels sized by frequency and positioned by spend vs volatility in{" "}
            {baseCurrency}
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

  if (!scatterData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Label Volatility Scatter</CardTitle>
          <CardDescription>
            Labels sized by frequency and positioned by spend vs volatility in{" "}
            {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No label volatility data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Label Volatility Scatter</CardTitle>
        <CardDescription>
          Higher and farther-right labels are both expensive and unstable over
          time in {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ChartContainer config={chartConfig}>
          <ScatterChart
            margin={{
              left: 12,
              right: 20,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid />
            <XAxis
              type="number"
              dataKey="totalAmount"
              name="Total spend"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
            />
            <YAxis
              type="number"
              dataKey="volatility"
              name="Volatility"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatCurrency(value, baseCurrency)}
              width={90}
            />
            <ZAxis
              type="number"
              dataKey="transactionCount"
              name="Transactions"
              range={[80, 420]}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }: TooltipProps<number, string>) => {
                if (!active || !payload?.length) return null;

                const point = payload[0].payload as ScatterPoint;
                const href = buildTransactionsHref({
                  walletId,
                  labelId: point.labelId,
                  from,
                  to,
                });

                return (
                  <div className="bg-background rounded-lg border p-3 shadow-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: point.color }}
                        />
                        <span className="text-sm font-medium">
                          {point.name}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Total spend
                          </span>
                          <Money
                            cents={point.totalAmountCents}
                            currency={baseCurrency}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Monthly volatility
                          </span>
                          <Money
                            cents={Math.round(point.volatilityCents)}
                            currency={baseCurrency}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Transactions
                          </span>
                          <span>{point.transactionCount}</span>
                        </div>
                      </div>
                      {point.labelId ? (
                        <Link
                          href={href}
                          className="text-primary inline-flex text-sm font-medium underline-offset-4 hover:underline"
                        >
                          Open matching transactions
                        </Link>
                      ) : (
                        <div className="text-muted-foreground text-xs">
                          Drill-down is only available for named labels.
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Scatter data={scatterData} fill={ChartColors.palette.blue}>
              {scatterData.map((point) => (
                <Cell key={point.id} fill={point.fill} />
              ))}
            </Scatter>
          </ScatterChart>
        </ChartContainer>

        <div className="grid gap-2">
          {scatterData.map((point) => {
            const content = (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: point.color }}
                  />
                  <span className="font-medium">{point.name}</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-4">
                  <span>
                    Total {formatCurrency(point.totalAmount, baseCurrency)}
                  </span>
                  <span>
                    Vol {formatCurrency(point.volatility, baseCurrency)}
                  </span>
                  <span>{point.transactionCount} tx</span>
                </div>
              </>
            );

            if (!point.labelId) {
              return (
                <div
                  key={point.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={point.id}
                href={buildTransactionsHref({
                  walletId,
                  labelId: point.labelId,
                  from,
                  to,
                })}
                className="hover:bg-muted/50 flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
