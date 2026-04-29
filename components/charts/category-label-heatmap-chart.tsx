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
  CategoryLabelHeatmapCell,
  getCategoryLabelHeatmapData,
} from "@/utils/supabase/queries";

interface CategoryLabelHeatmapChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

interface HeatmapCell {
  categoryId: string | null;
  categoryName: string;
  labelId: string | null;
  labelName: string;
  labelColor: string | null;
  amountCents: number;
  transactionCount: number;
}

interface HeatmapRow {
  categoryId: string | null;
  categoryName: string;
  totalCents: number;
  cells: HeatmapCell[];
}

const EMPTY_CELL: HeatmapCell = {
  categoryId: null,
  categoryName: "",
  labelId: null,
  labelName: "",
  labelColor: null,
  amountCents: 0,
  transactionCount: 0,
};

function buildTransactionsHref({
  walletId,
  labelId,
  categoryId,
  from,
  to,
}: {
  walletId?: string;
  labelId?: string | null;
  categoryId?: string | null;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();

  if (labelId) params.set("label_id", labelId);
  if (categoryId) params.set("category_id", categoryId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const query = params.toString();
  const basePath = walletId
    ? `/app/transactions/${walletId}`
    : "/app/transactions";

  return query ? `${basePath}?${query}` : basePath;
}

function formatCompactCurrency(valueCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(valueCents / 100);
}

function getHeatColor(intensity: number) {
  const alpha = 0.08 + intensity * 0.72;
  return `hsl(var(--primary) / ${alpha})`;
}

export function CategoryLabelHeatmapChart({
  walletId,
  from,
  to,
}: CategoryLabelHeatmapChartProps) {
  const [wallets, walletMap] = useWallets();
  const workspaceWalletIds = wallets.map((wallet) => wallet.id);
  const { baseCurrency, conversionRates } = useCurrency();

  const { data, isLoading, error } = useQuery({
    queryKey: ["category-label-heatmap", walletId, workspaceWalletIds, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getCategoryLabelHeatmapData(supabase, {
        walletId,
        workspaceWalletIds,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const heatmap = useMemo(() => {
    if (!data?.length) {
      return {
        labels: [] as Array<{
          labelId: string | null;
          labelName: string;
          labelColor: string | null;
          totalCents: number;
        }>,
        rows: [] as HeatmapRow[],
        maxAmountCents: 0,
      };
    }

    const aggregated = new Map<string, HeatmapCell>();

    data.forEach((cell: CategoryLabelHeatmapCell) => {
      const wallet = cell.wallet_id ? walletMap.get(cell.wallet_id) : null;
      const amountCents = wallet
        ? convertCurrency(
            cell.amount_cents,
            wallet.currency,
            baseCurrency,
            conversionRates,
          )
        : cell.amount_cents;

      const key = `${cell.category_id ?? "unknown-category"}::${cell.label_id ?? "unknown-label"}`;
      const existing = aggregated.get(key);

      if (existing) {
        existing.amountCents += amountCents;
        existing.transactionCount += cell.transaction_count;
        return;
      }

      aggregated.set(key, {
        categoryId: cell.category_id,
        categoryName: cell.category_name,
        labelId: cell.label_id,
        labelName: cell.label_name,
        labelColor: cell.label_color,
        amountCents,
        transactionCount: cell.transaction_count,
      });
    });

    const categoryTotals = new Map<string, { id: string | null; name: string; totalCents: number }>();
    const labelTotals = new Map<
      string,
      {
        id: string | null;
        name: string;
        color: string | null;
        totalCents: number;
      }
    >();

    aggregated.forEach((cell) => {
      const categoryKey = cell.categoryId ?? "unknown-category";
      const labelKey = cell.labelId ?? "unknown-label";

      const categoryTotal = categoryTotals.get(categoryKey);
      if (categoryTotal) {
        categoryTotal.totalCents += cell.amountCents;
      } else {
        categoryTotals.set(categoryKey, {
          id: cell.categoryId,
          name: cell.categoryName,
          totalCents: cell.amountCents,
        });
      }

      const labelTotal = labelTotals.get(labelKey);
      if (labelTotal) {
        labelTotal.totalCents += cell.amountCents;
      } else {
        labelTotals.set(labelKey, {
          id: cell.labelId,
          name: cell.labelName,
          color: cell.labelColor,
          totalCents: cell.amountCents,
        });
      }
    });

    const labels = Array.from(labelTotals.values()).sort(
      (left, right) => right.totalCents - left.totalCents,
    );
    const categories = Array.from(categoryTotals.values()).sort(
      (left, right) => right.totalCents - left.totalCents,
    );

    const rows = categories.map<HeatmapRow>((category) => ({
      categoryId: category.id,
      categoryName: category.name,
      totalCents: category.totalCents,
      cells: labels.map((label) => {
        const key = `${category.id ?? "unknown-category"}::${label.id ?? "unknown-label"}`;
        return aggregated.get(key) ?? { ...EMPTY_CELL, categoryName: category.name, labelName: label.name };
      }),
    }));

    const maxAmountCents = Math.max(
      ...Array.from(aggregated.values()).map((cell) => cell.amountCents),
      0,
    );

    return {
      labels: labels.map((label) => ({
        labelId: label.id,
        labelName: label.name,
        labelColor: label.color,
        totalCents: label.totalCents,
      })),
      rows,
      maxAmountCents,
    };
  }, [baseCurrency, conversionRates, data, walletMap]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category × Label Heatmap</CardTitle>
          <CardDescription>
            How objective categories map to subjective labels in {baseCurrency}
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
          <CardTitle>Category × Label Heatmap</CardTitle>
          <CardDescription>
            How objective categories map to subjective labels in {baseCurrency}
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

  if (!heatmap.rows.length || !heatmap.labels.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category × Label Heatmap</CardTitle>
          <CardDescription>
            How objective categories map to subjective labels in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No label/category expense data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category × Label Heatmap</CardTitle>
        <CardDescription>
          Click a cell to inspect how each category gets framed by subjective
          labels in {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `minmax(180px, 220px) repeat(${heatmap.labels.length}, minmax(104px, 1fr))`,
              minWidth: `${220 + heatmap.labels.length * 104}px`,
            }}
          >
            <div className="sticky left-0 z-10 bg-background py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Category
            </div>
            {heatmap.labels.map((label) => (
              <div
                key={label.labelId ?? label.labelName}
                className="space-y-1 py-2 text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        label.labelColor ?? "hsl(var(--muted-foreground))",
                    }}
                  />
                  <span className="truncate text-sm font-medium">
                    {label.labelName}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCompactCurrency(label.totalCents, baseCurrency)}
                </div>
              </div>
            ))}

            {heatmap.rows.map((row) => (
              <Fragment key={row.categoryId ?? row.categoryName}>
                <div
                  className="sticky left-0 z-10 flex flex-col justify-center bg-background pr-3"
                >
                  <span className="truncate text-sm font-medium">
                    {row.categoryName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCompactCurrency(row.totalCents, baseCurrency)}
                  </span>
                </div>
                {row.cells.map((cell) => {
                  const intensity =
                    heatmap.maxAmountCents > 0
                      ? cell.amountCents / heatmap.maxAmountCents
                      : 0;
                  const href = buildTransactionsHref({
                    walletId,
                    labelId: cell.labelId,
                    categoryId: cell.categoryId,
                    from,
                    to,
                  });

                  return (
                    <Popover
                      key={`${row.categoryId ?? row.categoryName}-${cell.labelId ?? cell.labelName}`}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "flex min-h-20 w-full items-end justify-start rounded-lg border p-3 text-left transition hover:-translate-y-0.5",
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
                              ? formatCompactCurrency(
                                  cell.amountCents,
                                  baseCurrency,
                                )
                              : "0"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 space-y-3" align="start">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold">
                            {row.categoryName} × {cell.labelName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Subjective intent inside this category
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
                        <Link
                          href={href}
                          className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Open matching transactions
                        </Link>
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
