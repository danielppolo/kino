"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { cn } from "@/lib/utils";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import {
  getLabelWeekdayPatternData,
  LabelWeekdayPatternCell,
} from "@/utils/supabase/queries";

interface LabelTimingHeatmapChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface TimingCell {
  weekday: number;
  labelId: string | null;
  labelName: string;
  labelColor: string | null;
  amountCents: number;
  transactionCount: number;
}

interface TimingRow {
  labelId: string | null;
  labelName: string;
  labelColor: string | null;
  totalCents: number;
  cells: TimingCell[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function getHeatColor(intensity: number) {
  const alpha = 0.08 + intensity * 0.72;
  return `hsl(var(--primary) / ${alpha})`;
}

export function LabelTimingHeatmapChart({
  walletId,
  from,
  to,
}: LabelTimingHeatmapChartProps) {
  const [wallets, walletMap] = useWallets();
  const workspaceWalletIds = wallets.map((wallet) => wallet.id);
  const { baseCurrency, conversionRates } = useCurrency();

  const { data, isLoading, error } = useQuery({
    queryKey: ["label-timing-heatmap", walletId, workspaceWalletIds, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getLabelWeekdayPatternData(supabase, {
        walletId,
        workspaceWalletIds,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const timing = useMemo(() => {
    if (!data?.length) {
      return {
        rows: [] as TimingRow[],
        maxAmountCents: 0,
      };
    }

    const aggregated = new Map<string, TimingCell>();
    const labelTotals = new Map<
      string,
      { labelId: string | null; labelName: string; labelColor: string | null; totalCents: number }
    >();

    data.forEach((cell: LabelWeekdayPatternCell) => {
      const wallet = cell.wallet_id ? walletMap.get(cell.wallet_id) : null;
      const amountCents = wallet
        ? convertCurrency(
            cell.amount_cents,
            wallet.currency,
            baseCurrency,
            conversionRates,
          )
        : cell.amount_cents;

      const labelKey = cell.label_id ?? "unknown-label";
      const key = `${labelKey}::${cell.weekday}`;
      const existing = aggregated.get(key);

      if (existing) {
        existing.amountCents += amountCents;
        existing.transactionCount += cell.transaction_count;
      } else {
        aggregated.set(key, {
          weekday: cell.weekday,
          labelId: cell.label_id,
          labelName: cell.label_name,
          labelColor: cell.label_color,
          amountCents,
          transactionCount: cell.transaction_count,
        });
      }

      const labelTotal = labelTotals.get(labelKey);
      if (labelTotal) {
        labelTotal.totalCents += amountCents;
      } else {
        labelTotals.set(labelKey, {
          labelId: cell.label_id,
          labelName: cell.label_name,
          labelColor: cell.label_color,
          totalCents: amountCents,
        });
      }
    });

    const topLabels = Array.from(labelTotals.values())
      .sort((left, right) => right.totalCents - left.totalCents)
      .slice(0, 8);
    const topLabelKeys = new Set(
      topLabels.map((label) => label.labelId ?? "unknown-label"),
    );

    const rows = topLabels.map<TimingRow>((label) => ({
      labelId: label.labelId,
      labelName: label.labelName,
      labelColor: label.labelColor,
      totalCents: label.totalCents,
      cells: WEEKDAYS.map((_, weekday) => {
        const key = `${label.labelId ?? "unknown-label"}::${weekday}`;
        return (
          aggregated.get(key) ?? {
            weekday,
            labelId: label.labelId,
            labelName: label.labelName,
            labelColor: label.labelColor,
            amountCents: 0,
            transactionCount: 0,
          }
        );
      }),
    }));

    const otherCells = new Map<number, TimingCell>();
    let otherTotalCents = 0;

    aggregated.forEach((cell) => {
      const labelKey = cell.labelId ?? "unknown-label";
      if (topLabelKeys.has(labelKey)) return;

      otherTotalCents += cell.amountCents;

      const existing = otherCells.get(cell.weekday);
      if (existing) {
        existing.amountCents += cell.amountCents;
        existing.transactionCount += cell.transactionCount;
      } else {
        otherCells.set(cell.weekday, {
          weekday: cell.weekday,
          labelId: null,
          labelName: "Other",
          labelColor: null,
          amountCents: cell.amountCents,
          transactionCount: cell.transactionCount,
        });
      }
    });

    if (otherTotalCents > 0) {
      rows.push({
        labelId: null,
        labelName: "Other",
        labelColor: null,
        totalCents: otherTotalCents,
        cells: WEEKDAYS.map((_, weekday) => (
          otherCells.get(weekday) ?? {
            weekday,
            labelId: null,
            labelName: "Other",
            labelColor: null,
            amountCents: 0,
            transactionCount: 0,
          }
        )),
      });
    }

    const maxAmountCents = Math.max(
      ...rows.flatMap((row) => row.cells.map((cell) => cell.amountCents)),
      0,
    );

    return { rows, maxAmountCents };
  }, [baseCurrency, conversionRates, data, walletMap]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Label Timing Heatmap</CardTitle>
          <CardDescription>
            Which labels dominate each weekday in {baseCurrency}
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
          <CardTitle>Label Timing Heatmap</CardTitle>
          <CardDescription>
            Which labels dominate each weekday in {baseCurrency}
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

  if (!timing.rows.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Label Timing Heatmap</CardTitle>
          <CardDescription>
            Which labels dominate each weekday in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No weekday label patterns available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Label Timing Heatmap</CardTitle>
        <CardDescription>
          Click a cell to inspect which labels tend to appear on each weekday in{" "}
          {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "minmax(180px, 220px) repeat(7, minmax(92px, 1fr))",
              minWidth: "900px",
            }}
          >
            <div className="sticky left-0 z-10 bg-background py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Label
            </div>
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="py-2 text-center text-sm font-medium text-muted-foreground"
              >
                {weekday}
              </div>
            ))}

            {timing.rows.map((row) => (
              <Fragment key={row.labelId ?? row.labelName}>
                <div
                  className="sticky left-0 z-10 flex flex-col justify-center bg-background pr-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          row.labelColor ?? "hsl(var(--muted-foreground))",
                      }}
                    />
                    <span className="truncate text-sm font-medium">
                      {row.labelName}
                    </span>
                  </div>
                  <Money
                    cents={row.totalCents}
                    currency={baseCurrency}
                    as="span"
                    className="text-xs text-muted-foreground"
                  />
                </div>
                {row.cells.map((cell) => {
                  const intensity =
                    timing.maxAmountCents > 0
                      ? cell.amountCents / timing.maxAmountCents
                      : 0;
                  const href = buildTransactionsHref({
                    walletId,
                    labelId: row.labelName === "Other" ? null : cell.labelId,
                    from,
                    to,
                  });

                  return (
                    <Popover
                      key={`${row.labelId ?? row.labelName}-${cell.weekday}`}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "flex min-h-16 w-full items-end justify-start rounded-lg border p-3 text-left transition hover:-translate-y-0.5",
                            cell.amountCents > 0
                              ? "border-border/60"
                              : "border-dashed border-border/40",
                          )}
                          style={{
                            backgroundColor:
                              cell.amountCents > 0
                                ? getHeatColor(intensity)
                                : "hsl(var(--muted) / 0.25)",
                          }}
                        >
                          <span
                            className={cn(
                              "text-xs font-medium",
                              intensity > 0.58
                                ? "text-primary-foreground"
                                : "text-foreground",
                            )}
                          >
                            {cell.amountCents > 0
                              ? Math.round(cell.amountCents / 100)
                              : "0"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 space-y-3" align="start">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold">
                            {row.labelName} on {WEEKDAYS[cell.weekday]}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Weekday pattern for this subjective label
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Amount</span>
                            <Money
                              cents={cell.amountCents}
                              currency={baseCurrency}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">
                              Transactions
                            </span>
                            <span>{cell.transactionCount}</span>
                          </div>
                        </div>
                        {row.labelName !== "Other" ? (
                          <Link
                            href={href}
                            className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                          >
                            Open matching transactions
                          </Link>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            Drill-down is only available for named labels.
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
