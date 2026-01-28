"use client";

import React from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

import Color from "../shared/color";
import { TransactionLink } from "../shared/transaction-link";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getCategoryTrends, getMonthlyLabelStats } from "@/utils/supabase/queries";
import { ChartColors } from "@/utils/constants";
import { ChartConfig } from "@/components/ui/chart";
import { Money } from "@/components/ui/money";
import { TrendingIndicator } from "@/components/ui/trending-indicator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StackedTrendsChart } from "./shared/stacked-trends-chart";

interface TrendsChartProps {
  variant: "labels" | "categories";
  walletId?: string;
  from?: string;
  to?: string;
  type: "income" | "expense" | "net";
  title?: string;
}

interface ChartDataPoint {
  month: string;
  [key: string]: number | string;
}

const CATEGORY_COLORS = [
  ChartColors.hsl.green,
  ChartColors.hsl.blue,
  ChartColors.hsl.purple,
  ChartColors.hsl.darkPurple,
  ChartColors.hsl.orange,
  ChartColors.hsl.yellow,
  ChartColors.hsl.teal,
  ChartColors.hsl.cyan,
  ChartColors.hsl.pink,
  ChartColors.hsl.lightYellow,
];

export function TrendsChart({
  variant,
  walletId,
  from,
  to,
  type,
  title,
}: TrendsChartProps) {
  const [wallets, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  // Fetch data based on variant
  const {
    data: rawData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [variant === "categories" ? "category-trends" : "label-trends", walletId, from, to, type],
    queryFn: async () => {
      const supabase = await createClient();

      if (variant === "categories") {
        const { data, error } = await getCategoryTrends(supabase, {
          walletId,
          from,
          to,
          type: type === "net" ? "expense" : type, // categories don't support net
        });
        if (error) throw error;
        return { type: "categories" as const, data };
      } else {
        const { data, error } = await getMonthlyLabelStats(supabase, {
          walletId,
          from,
          to,
          type,
        });
        if (error) throw error;
        return { type: "labels" as const, data };
      }
    },
  });

  // Transform data based on variant
  const { chartData, chartConfig, dataItems, totals } = React.useMemo(() => {
    if (!rawData?.data || rawData.data.length === 0) {
      return { chartData: [], chartConfig: {}, dataItems: [], totals: [] };
    }

    if (rawData.type === "categories") {
      // Process category data
      const categoryData = rawData.data as any[];
      const monthGroups: Record<string, Record<string, number>> = {};

      categoryData.forEach((stat) => {
        if (!monthGroups[stat.month]) {
          monthGroups[stat.month] = {};
        }

        const wallet = walletMap.get(stat.wallet_id);
        if (!wallet) return;

        const rate = conversionRates[wallet.currency]?.rate ?? 1;
        const convertedAmount = (stat.amount_cents * rate) / 100;

        if (!monthGroups[stat.month][stat.category_id]) {
          monthGroups[stat.month][stat.category_id] = 0;
        }
        monthGroups[stat.month][stat.category_id] += convertedAmount;
      });

      // Calculate outlier threshold (99.7th percentile)
      const allValues: number[] = [];
      Object.values(monthGroups).forEach((categories) => {
        Object.values(categories).forEach((amount) => {
          allValues.push(amount);
        });
      });

      const sorted = [...allValues].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.997);
      const p95Value = sorted[p95Index] || Infinity;

      // Build chart data with outlier capping
      const chartData = Object.entries(monthGroups)
        .map(([month, categories]) => {
          const dataPoint: ChartDataPoint = { month };
          const originalValues: Record<string, number> = {};

          Object.entries(categories).forEach(([categoryId, amount]) => {
            const cappedAmount = Math.min(amount, p95Value);
            dataPoint[categoryId] = cappedAmount;
            originalValues[categoryId] = amount;
          });

          (dataPoint as any)._original = originalValues;
          return dataPoint;
        })
        .sort((a, b) => new Date(a.month as string).getTime() - new Date(b.month as string).getTime());

      // Calculate totals and get top 10
      const categoryMap = new Map<string, { id: string; name: string; total: number }>();

      categoryData.forEach((stat) => {
        if (!categoryMap.has(stat.category_id)) {
          categoryMap.set(stat.category_id, {
            id: stat.category_id,
            name: stat.category_name,
            total: 0,
          });
        }
        const cat = categoryMap.get(stat.category_id)!;

        const wallet = walletMap.get(stat.wallet_id);
        if (wallet) {
          const rate = conversionRates[wallet.currency]?.rate ?? 1;
          cat.total += stat.amount_cents * rate;
        }
      });

      const dataItems = Array.from(categoryMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      const chartConfig: ChartConfig = dataItems.reduce(
        (acc, category, index) => ({
          ...acc,
          [category.id]: {
            label: category.name,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
          },
        }),
        {}
      );

      return { chartData, chartConfig, dataItems, totals: dataItems };
    } else {
      // Process label data
      const labelData = rawData.data as any[];

      // Generate all months in range
      const allMonths = new Set<string>();
      if (from && to) {
        const startDate = new Date(from);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(to);
        endDate.setDate(1);
        endDate.setHours(0, 0, 0, 0);

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const monthKey = format(currentDate, "yyyy-MM-01");
          allMonths.add(monthKey);
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      // Collect labels and aggregate data
      const labels = new Map();
      const months = new Set<string>();
      const aggregatedData = new Map();

      labelData.forEach((item) => {
        const month = item.month;
        const labelId = item.labels?.id;
        const labelName = item.labels?.name || "Unknown";
        const labelColor = item.labels?.color || "#8884d8";
        const safeKey = labelName.replace(/[^a-zA-Z0-9]/g, "_");

        if (!labels.has(labelId)) {
          labels.set(labelId, {
            id: labelId,
            name: labelName,
            safeKey: safeKey,
            color: labelColor,
          });
        }

        months.add(month);

        const wallet = walletMap.get(item.wallet_id);
        if (!wallet) return;

        const rate = conversionRates[wallet.currency]?.rate ?? 1;

        const rawValue =
          type === "income"
            ? item.income_cents
            : type === "expense"
            ? Math.abs(item.outcome_cents)
            : Math.abs(item.net_cents);

        // Convert to currency units (divide by 100) to match categories format
        const convertedValue = (rawValue * rate) / 100;

        const key = `${month}|${labelId}`;
        const existingValue = aggregatedData.get(key) || 0;
        aggregatedData.set(key, existingValue + convertedValue);
      });

      // Use all months if no range specified
      if (!from || !to) {
        months.forEach((month) => allMonths.add(month));
      }

      // Calculate outlier threshold (99.7th percentile) for normalization
      const allValues: number[] = [];
      aggregatedData.forEach((value) => {
        allValues.push(value);
      });

      const sorted = [...allValues].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.997);
      const p95Value = sorted[p95Index] || Infinity;

      // Build monthly data structure
      const monthlyData = new Map();
      const labelSafeKeys = Array.from(labels.values()).map((label) => label.safeKey);

      allMonths.forEach((month) => {
        const monthEntry: ChartDataPoint = { month, empty: 0 };
        labelSafeKeys.forEach((safeKey) => {
          monthEntry[safeKey] = 0;
        });
        monthlyData.set(month, monthEntry);
      });

      // Populate with aggregated values (with outlier capping)
      aggregatedData.forEach((value, key) => {
        const [month, labelId] = key.split("|");
        const label = labels.get(labelId);

        if (label && monthlyData.has(month)) {
          const monthEntry = monthlyData.get(month);
          // Store original values for tooltip
          if (!(monthEntry as any)._original) {
            (monthEntry as any)._original = {};
          }
          (monthEntry as any)._original[label.safeKey] = value;
          // Store capped value for chart
          monthEntry[label.safeKey] = Math.min(value, p95Value);
        }
      });

      const chartData = Array.from(monthlyData.values()).sort((a, b) =>
        a.month.localeCompare(b.month)
      );

      // Build config
      const chartConfig: ChartConfig = {};
      Array.from(labels.values())
        .reverse()
        .forEach((label) => {
          chartConfig[label.safeKey] = {
            label: label.name,
            color: label.color,
          };
        });

      // Calculate totals
      const labelMap = new Map();
      labelData.forEach((item) => {
        const labelId = item.labels?.id;
        const labelName = item.labels?.name || "Unknown";
        const labelColor = item.labels?.color || "#8884d8";
        const safeKey = labelName.replace(/[^a-zA-Z0-9]/g, "_");

        const wallet = walletMap.get(item.wallet_id);
        if (!wallet) return;

        const rate = conversionRates[wallet.currency]?.rate ?? 1;

        const rawValue =
          type === "income"
            ? item.income_cents
            : type === "expense"
            ? Math.abs(item.outcome_cents)
            : Math.abs(item.net_cents);

        // Convert to currency units (divide by 100) to match categories format
        const convertedValue = (rawValue * rate) / 100;

        if (!labelMap.has(labelId)) {
          labelMap.set(labelId, {
            id: labelId,
            name: labelName,
            total: 0,
            color: labelColor,
            safeKey: safeKey,
          });
        }

        labelMap.get(labelId).total += convertedValue;
      });

      const totals = Array.from(labelMap.values()).sort((a, b) => b.total - a.total);

      const dataItems = Array.from(labels.values()).map((label) => ({
        id: label.safeKey,
        name: label.name,
        color: label.color,
      }));

      return { chartData, chartConfig, dataItems, totals };
    }
  }, [rawData, conversionRates, walletMap, from, to, type]);

  // Calculate percentage change
  const percentageChange = React.useMemo(() => {
    if (chartData.length < 2) return 0;

    const current = dataItems.reduce((total, item) => {
      const value = (chartData[chartData.length - 1][item.id] as number) || 0;
      return total + value;
    }, 0);

    const previous = dataItems.reduce((total, item) => {
      const value = (chartData[chartData.length - 2][item.id] as number) || 0;
      return total + value;
    }, 0);

    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }, [chartData, dataItems]);

  // Calculate total
  const total = React.useMemo(() => {
    return chartData.reduce((sum, month) => {
      return (
        sum +
        Object.keys(month)
          .filter((key) => key !== "month" && key !== "empty")
          .reduce((monthSum, label) => monthSum + ((month[label] as number) || 0), 0)
      );
    }, 0);
  }, [chartData]);

  // Build title and description
  const displayTitle = title || (variant === "categories" ? "Category Trends" : "Label Trends");
  const displayDescription =
    variant === "categories"
      ? `Top ${type === "income" ? "income" : "expense"} categories over time in ${baseCurrency} (extreme outliers normalized)`
      : `Showing ${type} trends by label over time in ${baseCurrency}${walletId ? " for this wallet" : " across all wallets"} (extreme outliers normalized)`;

  // Build footer
  const footer = (
    <div className="flex w-full flex-col gap-3 text-sm">
      <TrendingIndicator
        percentageChange={percentageChange}
        startDate={chartData.length > 0 ? (chartData[0].month as string) : undefined}
        endDate={
          chartData.length > 0
            ? (chartData[chartData.length - 1].month as string)
            : undefined
        }
      />

      {variant === "labels" && (
        <>
          <div className="flex items-center gap-2 leading-none font-medium">
            Total: <Money cents={Math.round(total * 100)} currency={baseCurrency} /> | {dataItems.length}{" "}
            labels
          </div>

          {totals.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="label-totals" className="border-none">
                <AccordionTrigger className="text-muted-foreground py-2 text-xs font-medium tracking-wide uppercase hover:no-underline">
                  Aggregated by Label
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-1">
                    {totals.map((label: any) => (
                      <TransactionLink
                        key={label.safeKey}
                        walletId={walletId}
                        labelId={label.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Color color={label.color} size="sm" />
                          <span className="text-sm">{label.name}</span>
                        </div>
                        <span className="text-sm font-medium">
                          <Money cents={Math.round(label.total * 100)} currency={baseCurrency} />
                        </span>
                      </TransactionLink>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <div className="text-muted-foreground flex items-center gap-2 leading-none">
            {from && to ? `${from} - ${to}` : "All time"}
            {walletId ? "" : " | All wallets"}
          </div>
        </>
      )}
    </div>
  );

  return (
    <StackedTrendsChart
      chartData={chartData}
      chartConfig={chartConfig}
      dataItems={dataItems}
      title={displayTitle}
      description={displayDescription}
      baseCurrency={baseCurrency}
      isLoading={isLoading}
      error={error}
      footer={footer}
      showOutlierWarning
    />
  );
}
