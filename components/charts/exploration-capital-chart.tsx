"use client";

import { useMemo } from "react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

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
import {
  useCategories,
  useCurrency,
  useWallets,
} from "@/contexts/settings-context";
import {
  calculateTrimmedMean,
  capChartOutliers,
  formatCurrency,
  parseMonthDate,
} from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import {
  getMonthlyCategoryStats,
  listBills,
  listRecurrentBills,
  listRecurringTransactions,
} from "@/utils/supabase/queries";

interface ExplorationCapitalChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

type ObligationKind = "none" | "atemporal" | "temporal";

type ChartPoint = {
  month: string;
  isForecast: boolean;
  atemporalAmount: number;
  temporalAmount: number;
  discretionaryAmount: number;
  incomeAmount: number;
  totalExpenseAmount: number;
  atemporalPct: number;
  temporalPct: number;
  discretionaryPct: number;
  incomePct: number;
  cappedAtemporalAmount?: number;
  cappedTemporalAmount?: number;
  cappedDiscretionaryAmount?: number;
  cappedIncomeAmount?: number;
  cappedAtemporalGuideAmount?: number;
  cappedDiscretionaryGuideAmount?: number;
  cappedRequiredGuideAmount?: number;
  cappedIncomeGuideAmount?: number;
  avgDiscretionaryPctGuide?: number;
  avgAtemporalPctGuide?: number;
  avgRequiredPctGuide?: number;
  avgIncomePctGuide?: number;
  _absoluteOriginal?: Partial<
    Record<
      | "atemporalAmount"
      | "temporalAmount"
      | "discretionaryAmount"
      | "incomeAmount",
      number
    >
  >;
};

function toMonthKey(date: string) {
  return format(startOfMonth(parseISO(date)), "yyyy-MM-dd");
}

function getObligationKind(
  category?: {
    required_spend_kind?: string | null;
  } | null,
): ObligationKind {
  if (category?.required_spend_kind === "atemporal") return "atemporal";
  if (category?.required_spend_kind === "temporal") return "temporal";
  return "none";
}

function isMonthWithinWindow(
  month: string,
  startDate?: string | null,
  endDate?: string | null,
) {
  const startMonth = startDate ? toMonthKey(startDate) : null;
  const endMonth = endDate ? toMonthKey(endDate) : null;

  if (startMonth && month < startMonth) return false;
  if (endMonth && month > endMonth) return false;
  return true;
}

function toMonthlyAmount(amount: number, intervalType: string) {
  switch (intervalType) {
    case "daily":
      return (amount * 365) / 12;
    case "weekly":
      return (amount * 52) / 12;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    case "monthly":
    default:
      return amount;
  }
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toPercentPoint(
  point: Omit<
    ChartPoint,
    "atemporalPct" | "temporalPct" | "discretionaryPct" | "incomePct"
  >,
): ChartPoint {
  if (point.totalExpenseAmount <= 0) {
    return {
      ...point,
      atemporalPct: 0,
      temporalPct: 0,
      discretionaryPct: 0,
      incomePct: 0,
    };
  }

  const atemporalPct = (point.atemporalAmount / point.totalExpenseAmount) * 100;
  const temporalPct = (point.temporalAmount / point.totalExpenseAmount) * 100;
  const discretionaryPct = Math.max(0, 100 - atemporalPct - temporalPct);
  const incomePct = Math.min(
    100,
    (point.incomeAmount / point.totalExpenseAmount) * 100,
  );

  return {
    ...point,
    atemporalPct,
    temporalPct,
    discretionaryPct,
    incomePct,
  };
}

export function ExplorationCapitalChart({
  walletId,
  from,
  to,
}: ExplorationCapitalChartProps) {
  const controls = useChartControls();
  const [wallets, walletMap] = useWallets();
  const [categories, categoryMap] = useCategories();
  const { conversionRates, baseCurrency } = useCurrency();
  const chartValueMode = controls?.chartValueMode ?? "percentage";
  const peakNormalizationPercentile =
    controls?.peakNormalizationPercentile ?? 0.97;
  const forecastHorizonYears = controls?.forecastHorizonYears ?? 1;
  const forecastHorizonMonths = forecastHorizonYears * 12;
  const effectiveMonthlySpend = controls?.effectiveMonthlySpend ?? 0;
  const workspaceWalletIds = useMemo(
    () => wallets.map((wallet) => wallet.id),
    [wallets],
  );

  const { data: expenseCategoryStats, isLoading: loadingExpenses } = useQuery({
    queryKey: [
      "exploration-capital-expense-stats",
      walletId,
      workspaceWalletIds,
      from,
      to,
    ],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyCategoryStats(supabase, {
        walletId,
        workspaceWalletIds,
        from,
        to,
        type: "expense",
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: incomeCategoryStats, isLoading: loadingIncome } = useQuery({
    queryKey: [
      "exploration-capital-income-stats",
      walletId,
      workspaceWalletIds,
      from,
      to,
    ],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyCategoryStats(supabase, {
        walletId,
        workspaceWalletIds,
        from,
        to,
        type: "income",
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recurringIncome, isLoading: loadingRecurringIncome } = useQuery(
    {
      queryKey: [
        "exploration-capital-recurring-income",
        walletId,
        workspaceWalletIds,
      ],
      queryFn: async () => {
        const supabase = await createClient();
        const { data, error } = await listRecurringTransactions(supabase, {
          walletId,
          workspaceWalletIds,
          type: "income",
        });
        if (error) throw error;
        return data ?? [];
      },
    },
  );

  const { data: bills, isLoading: loadingBills } = useQuery({
    queryKey: ["exploration-capital-bills", walletId, workspaceWalletIds],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await listBills(supabase, {
        walletId,
        workspaceWalletIds,
        pageSize: 1000,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recurrentBills, isLoading: loadingRecurrentBills } = useQuery({
    queryKey: [
      "exploration-capital-recurrent-bills",
      walletId,
      workspaceWalletIds,
    ],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await listRecurrentBills(supabase, {
        walletId,
        workspaceWalletIds,
        pageSize: 1000,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading =
    loadingExpenses ||
    loadingIncome ||
    loadingRecurringIncome ||
    loadingBills ||
    loadingRecurrentBills;

  const {
    chartData,
    chartConfig,
    topCategoryNames,
    currentDiscretionaryPct,
    currentDiscretionaryAmount,
    avgDiscretionaryPct,
    avgDiscretionaryAmount,
    avgAtemporalPct,
    avgTemporalPct,
    avgIncomePct,
    avgAtemporalAmount,
    avgTemporalAmount,
    avgIncomeAmount,
    lastHistoricalMonth,
    currentPoint,
  } = useMemo(() => {
    if (
      (!expenseCategoryStats || expenseCategoryStats.length === 0) &&
      (!incomeCategoryStats || incomeCategoryStats.length === 0)
    ) {
      return {
        chartData: [] as ChartPoint[],
        chartConfig: {} as ChartConfig,
        topCategoryNames: [] as string[],
        currentDiscretionaryPct: 0,
        currentDiscretionaryAmount: 0,
        avgDiscretionaryPct: 0,
        avgDiscretionaryAmount: 0,
        avgAtemporalPct: 0,
        avgTemporalPct: 0,
        avgIncomePct: 0,
        avgAtemporalAmount: 0,
        avgTemporalAmount: 0,
        avgIncomeAmount: 0,
        lastHistoricalMonth: null as string | null,
        currentPoint: null as ChartPoint | null,
      };
    }

    const byMonth = new Map<
      string,
      Omit<
        ChartPoint,
        | "atemporalPct"
        | "temporalPct"
        | "discretionaryPct"
        | "incomePct"
        | "cappedAtemporalAmount"
        | "cappedTemporalAmount"
        | "cappedDiscretionaryAmount"
        | "cappedIncomeAmount"
        | "_absoluteOriginal"
      >
    >();
    const categoryHistory = new Map<string, number[]>();
    const categoryTotals = new Map<string, number>();

    const ensureMonth = (month: string) => {
      const existing = byMonth.get(month);
      if (existing) return existing;

      const seed = {
        month,
        isForecast: false,
        atemporalAmount: 0,
        temporalAmount: 0,
        discretionaryAmount: 0,
        incomeAmount: 0,
        totalExpenseAmount: 0,
      };
      byMonth.set(month, seed);
      return seed;
    };

    expenseCategoryStats?.forEach((stat) => {
      const month = stat.month;
      const bucket = ensureMonth(month);
      const wallet = walletMap.get(stat.wallet_id ?? "");
      const currency = wallet?.currency ?? baseCurrency;
      const expenseAmount =
        Math.abs(
          convertCurrency(
            stat.outcome_cents,
            currency,
            baseCurrency,
            conversionRates,
          ),
        ) / 100;

      const category =
        stat.categories ??
        (stat.category_id ? categoryMap.get(stat.category_id) : null);
      const requiredSpendKind = getObligationKind(category);

      if (requiredSpendKind === "atemporal") {
        bucket.atemporalAmount += expenseAmount;
      } else if (requiredSpendKind === "temporal") {
        bucket.temporalAmount += expenseAmount;
      } else {
        bucket.discretionaryAmount += expenseAmount;
      }

      bucket.totalExpenseAmount += expenseAmount;

      if (stat.category_id) {
        if (!categoryHistory.has(stat.category_id)) {
          categoryHistory.set(stat.category_id, []);
        }
        if (expenseAmount > 0) {
          categoryHistory.get(stat.category_id)?.push(expenseAmount);
        }
        categoryTotals.set(
          stat.category_id,
          (categoryTotals.get(stat.category_id) ?? 0) + expenseAmount,
        );
      }
    });

    incomeCategoryStats?.forEach((stat) => {
      const month = stat.month;
      const bucket = ensureMonth(month);
      const wallet = walletMap.get(stat.wallet_id ?? "");
      const currency = wallet?.currency ?? baseCurrency;
      bucket.incomeAmount +=
        Math.abs(
          convertCurrency(
            stat.income_cents,
            currency,
            baseCurrency,
            conversionRates,
          ),
        ) / 100;
    });

    const historicalMonths = Array.from(byMonth.keys()).sort(
      (left, right) => new Date(left).getTime() - new Date(right).getTime(),
    );
    const lastMonth = historicalMonths[historicalMonths.length - 1] ?? null;

    const obligationCategories = categories
      .filter(
        (category) =>
          category.type === "expense" && getObligationKind(category) !== "none",
      )
      .sort((left, right) => {
        const rightTotal = categoryTotals.get(right.id) ?? 0;
        const leftTotal = categoryTotals.get(left.id) ?? 0;
        if (rightTotal !== leftTotal) return rightTotal - leftTotal;
        return left.name.localeCompare(right.name);
      });

    const topNames = obligationCategories.map((category) => category.name);

    const projectedExpenseBaseline = calculateTrimmedMean(
      historicalMonths
        .map((month) => byMonth.get(month)?.totalExpenseAmount ?? 0)
        .filter((value) => value > 0),
    );

    const projectedAtemporalBaseline = calculateTrimmedMean(
      historicalMonths
        .map((month) => byMonth.get(month)?.atemporalAmount ?? 0)
        .filter((value) => value > 0),
    );

    const projectedCategoryAmounts = new Map<string, number>();
    obligationCategories.forEach((category) => {
      const activeHistory = (categoryHistory.get(category.id) ?? []).slice(-12);
      const projectedAmount =
        activeHistory.length === 0
          ? 0
          : activeHistory.length < 3
            ? mean(activeHistory)
            : calculateTrimmedMean(activeHistory);
      projectedCategoryAmounts.set(category.id, projectedAmount);
    });

    const historicalData = historicalMonths.map((month) =>
      toPercentPoint(byMonth.get(month)!),
    );

    const forecastData: ChartPoint[] = [];

    if (lastMonth !== null) {
      for (let index = 0; index < forecastHorizonMonths; index += 1) {
        const month = format(
          addMonths(parseMonthDate(lastMonth), index + 1),
          "yyyy-MM-dd",
        );

        const atemporalAmount = projectedAtemporalBaseline;

        const temporalAmountFromBills =
          bills?.reduce((sum, bill) => {
            const billMonth = toMonthKey(bill.due_date);
            if (billMonth !== month) return sum;

            const wallet = walletMap.get(bill.wallet_id);
            const currency = wallet?.currency ?? bill.currency ?? baseCurrency;
            return (
              sum +
              Math.abs(
                convertCurrency(
                  bill.amount_cents,
                  currency,
                  baseCurrency,
                  conversionRates,
                ),
              ) /
                100
            );
          }, 0) ?? 0;

        const temporalAmountFromRecurrentBills =
          recurrentBills?.reduce((sum, recurrentBill) => {
            if (
              !isMonthWithinWindow(
                month,
                recurrentBill.start_date,
                recurrentBill.end_date,
              )
            ) {
              return sum;
            }

            const wallet = walletMap.get(recurrentBill.wallet_id);
            const currency =
              wallet?.currency ?? recurrentBill.currency ?? baseCurrency;
            const baseAmount =
              Math.abs(
                convertCurrency(
                  recurrentBill.amount_cents,
                  currency,
                  baseCurrency,
                  conversionRates,
                ),
              ) / 100;
            return (
              sum + toMonthlyAmount(baseAmount, recurrentBill.interval_type)
            );
          }, 0) ?? 0;

        const temporalAmount =
          temporalAmountFromBills + temporalAmountFromRecurrentBills;

        const forecastMonthlySpend =
          effectiveMonthlySpend > 0
            ? effectiveMonthlySpend
            : projectedExpenseBaseline;
        const totalExpenseAmount = Math.max(
          forecastMonthlySpend,
          atemporalAmount + temporalAmount,
        );
        const discretionaryAmount = Math.max(
          totalExpenseAmount - atemporalAmount - temporalAmount,
          0,
        );

        const incomeAmount =
          recurringIncome?.reduce((sum, transaction) => {
            if (
              !isMonthWithinWindow(
                month,
                transaction.start_date,
                transaction.end_date,
              )
            ) {
              return sum;
            }

            const wallet = walletMap.get(transaction.wallet_id);
            const currency = wallet?.currency ?? baseCurrency;
            const baseAmount =
              Math.abs(
                convertCurrency(
                  transaction.amount_cents,
                  currency,
                  baseCurrency,
                  conversionRates,
                ),
              ) / 100;

            return sum + toMonthlyAmount(baseAmount, transaction.interval_type);
          }, 0) ?? 0;

        forecastData.push(
          toPercentPoint({
            month,
            isForecast: true,
            atemporalAmount,
            temporalAmount,
            discretionaryAmount,
            incomeAmount,
            totalExpenseAmount,
          }),
        );
      }
    }

    const rawChartData = [...historicalData, ...forecastData];
    const absoluteCapped = capChartOutliers(
      rawChartData,
      [
        "atemporalAmount",
        "temporalAmount",
        "discretionaryAmount",
        "incomeAmount",
      ] as const,
      peakNormalizationPercentile,
    );

    const historicalOnlyRaw = rawChartData.filter((point) => !point.isForecast);

    const historicalAverage = (selector: (point: ChartPoint) => number) =>
      historicalOnlyRaw.length > 0
        ? historicalOnlyRaw.reduce((sum, point) => sum + selector(point), 0) /
          historicalOnlyRaw.length
        : 0;

    const avgAtemporalPctHistorical = historicalAverage(
      (point) => point.atemporalPct,
    );
    const avgTemporalPctHistorical = historicalAverage(
      (point) => point.temporalPct,
    );
    const avgIncomePctHistorical = historicalAverage(
      (point) => point.incomePct,
    );
    const avgDiscretionaryPctHistorical = historicalAverage(
      (point) => point.discretionaryPct,
    );
    const avgAtemporalAmountHistorical = historicalAverage(
      (point) => point.atemporalAmount,
    );
    const avgTemporalAmountHistorical = historicalAverage(
      (point) => point.temporalAmount,
    );
    const avgIncomeAmountHistorical = historicalAverage(
      (point) => point.incomeAmount,
    );
    const avgDiscretionaryAmountHistorical = historicalAverage(
      (point) => point.discretionaryAmount,
    );

    const cappedAmountSeries = absoluteCapped.data.flatMap((point) => [
      point.atemporalAmount ?? 0,
      (point.atemporalAmount ?? 0) + (point.temporalAmount ?? 0),
      point.incomeAmount ?? 0,
    ]);
    const cappedGuideMax =
      cappedAmountSeries.length > 0 ? Math.max(...cappedAmountSeries, 0) : 0;
    const rawGuideMax = Math.max(
      avgAtemporalAmountHistorical,
      avgAtemporalAmountHistorical + avgTemporalAmountHistorical,
      avgIncomeAmountHistorical,
      0,
    );
    const guideScale =
      rawGuideMax > 0 && cappedGuideMax > 0 ? cappedGuideMax / rawGuideMax : 1;

    const normalizedChartData = rawChartData.map((point, index) => {
      const cappedPoint = absoluteCapped.data[index];
      return {
        ...point,
        cappedAtemporalAmount:
          cappedPoint?.atemporalAmount ?? point.atemporalAmount,
        cappedTemporalAmount:
          cappedPoint?.temporalAmount ?? point.temporalAmount,
        cappedDiscretionaryAmount:
          cappedPoint?.discretionaryAmount ?? point.discretionaryAmount,
        cappedIncomeAmount: cappedPoint?.incomeAmount ?? point.incomeAmount,
        cappedAtemporalGuideAmount:
          avgAtemporalAmountHistorical > 0
            ? clamp(
                avgAtemporalAmountHistorical * guideScale,
                0,
                cappedGuideMax,
              )
            : 0,
        cappedDiscretionaryGuideAmount:
          avgDiscretionaryAmountHistorical > 0
            ? clamp(
                avgDiscretionaryAmountHistorical * guideScale,
                0,
                cappedGuideMax,
              )
            : 0,
        cappedRequiredGuideAmount:
          avgAtemporalAmountHistorical + avgTemporalAmountHistorical > 0
            ? clamp(
                (avgAtemporalAmountHistorical + avgTemporalAmountHistorical) *
                  guideScale,
                0,
                cappedGuideMax,
              )
            : 0,
        cappedIncomeGuideAmount:
          avgIncomeAmountHistorical > 0
            ? clamp(avgIncomeAmountHistorical * guideScale, 0, cappedGuideMax)
            : 0,
        avgDiscretionaryPctGuide: avgDiscretionaryPctHistorical,
        avgAtemporalPctGuide: avgAtemporalPctHistorical,
        avgRequiredPctGuide:
          avgAtemporalPctHistorical + avgTemporalPctHistorical,
        avgIncomePctGuide: avgIncomePctHistorical,
        _absoluteOriginal: cappedPoint?._original ?? {},
      };
    });

    const historicalOnly = normalizedChartData.filter(
      (point) => !point.isForecast,
    );
    const currentHistoricalPoint =
      historicalOnly[historicalOnly.length - 1] ?? null;

    return {
      chartData: normalizedChartData,
      chartConfig: {
        atemporal: {
          label: "Always required",
          color: "#52525b",
        },
        temporal: {
          label: "Timed required",
          color: "#71717a",
        },
        discretionary: {
          label: "Exploration capital",
          color: "#2563eb",
        },
      } satisfies ChartConfig,
      topCategoryNames: topNames,
      currentDiscretionaryPct: currentHistoricalPoint?.discretionaryPct ?? 0,
      currentDiscretionaryAmount:
        currentHistoricalPoint?.discretionaryAmount ?? 0,
      avgDiscretionaryPct: avgDiscretionaryPctHistorical,
      avgDiscretionaryAmount: historicalAverage(
        (point) => point.discretionaryAmount,
      ),
      avgAtemporalPct: avgAtemporalPctHistorical,
      avgTemporalPct: avgTemporalPctHistorical,
      avgIncomePct: avgIncomePctHistorical,
      avgAtemporalAmount: avgAtemporalAmountHistorical,
      avgTemporalAmount: avgTemporalAmountHistorical,
      avgIncomeAmount: avgIncomeAmountHistorical,
      lastHistoricalMonth: lastMonth,
      currentPoint: currentHistoricalPoint,
    };
  }, [
    baseCurrency,
    bills,
    categories,
    categoryMap,
    conversionRates,
    expenseCategoryStats,
    effectiveMonthlySpend,
    forecastHorizonMonths,
    incomeCategoryStats,
    peakNormalizationPercentile,
    recurrentBills,
    recurringIncome,
    walletMap,
  ]);

  const percentageChange = useMemo(() => {
    const historicalData = chartData.filter((point) => !point.isForecast);
    if (historicalData.length < 2) return 0;

    const previous = historicalData[historicalData.length - 2];
    const current = historicalData[historicalData.length - 1];
    const previousValue =
      chartValueMode === "percentage"
        ? previous.discretionaryPct
        : previous.discretionaryAmount;
    const currentValue =
      chartValueMode === "percentage"
        ? current.discretionaryPct
        : current.discretionaryAmount;

    if (previousValue === 0) return 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  }, [chartData, chartValueMode]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exploration Capital</CardTitle>
          <CardDescription>
            Shows how much of your spending stays discretionary after required
            obligations and how that mix projects into the forecast window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length || !currentPoint) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exploration Capital</CardTitle>
          <CardDescription>
            Shows how much of your spending stays discretionary after required
            obligations and how that mix projects into the forecast window.
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
    currentDiscretionaryPct >= 40
      ? "#22c55e"
      : currentDiscretionaryPct >= 20
        ? "#f59e0b"
        : "#ef4444";
  const statusLabel =
    currentDiscretionaryPct >= 40
      ? "Healthy room"
      : currentDiscretionaryPct >= 20
        ? "Tight"
        : "Constrained";
  const headlineValue =
    chartValueMode === "percentage" ? (
      `${currentDiscretionaryPct.toFixed(0)}%`
    ) : (
      <Money
        cents={Math.round(currentDiscretionaryAmount * 100)}
        currency={baseCurrency}
        className="font-bold"
      />
    );
  const firstForecastMonth = chartData.find((point) => point.isForecast)?.month;

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
            ? "The stacked areas split every month into always-required, timed-required, and discretionary spend. Forecast months keep the same stack, with timed obligations sourced from bills."
            : "The stacked areas show monthly required and discretionary amounts, with forecast months projected from category history, bills, and recurring income. Extreme peaks are normalized using the global chart cap control."}{" "}
          {topCategoryNames.length > 0 ? (
            <>Required spend is anchored by {topCategoryNames.join(", ")}.</>
          ) : (
            <>
              Classify expense categories as required to improve the forecast.
            </>
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
              tickFormatter={(value) => format(parseMonthDate(value), "MMM yy")}
            />
            <YAxis
              domain={chartValueMode === "percentage" ? [0, 100] : [0, "auto"]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) =>
                chartValueMode === "percentage"
                  ? `${value.toFixed(0)}%`
                  : formatCurrency(value, baseCurrency)
              }
            />
            {firstForecastMonth && (
              <ReferenceArea
                x1={firstForecastMonth}
                x2={chartData[chartData.length - 1]?.month}
                fill="#ffffff"
                fillOpacity={0.04}
                strokeOpacity={0}
              />
            )}
            <ChartTooltip
              cursor={false}
              content={({ active, label }) => {
                if (!active || !label) return null;

                const point = chartData.find((entry) => entry.month === label);
                if (!point) return null;

                const original = point._absoluteOriginal ?? {};
                const atemporalAmount =
                  original.atemporalAmount ?? point.atemporalAmount;
                const temporalAmount =
                  original.temporalAmount ?? point.temporalAmount;
                const discretionaryAmount =
                  original.discretionaryAmount ?? point.discretionaryAmount;
                const incomeAmount =
                  original.incomeAmount ?? point.incomeAmount;
                const chartIsCapped =
                  chartValueMode === "absolute" &&
                  (atemporalAmount !== point.cappedAtemporalAmount ||
                    temporalAmount !== point.cappedTemporalAmount ||
                    discretionaryAmount !== point.cappedDiscretionaryAmount ||
                    incomeAmount !== point.cappedIncomeAmount);

                return (
                  <div className="bg-background rounded-lg border p-2 shadow-sm">
                    <div className="mb-1 text-sm font-medium">
                      {format(parseMonthDate(label), "MMMM yyyy")}
                      {point.isForecast ? " · projected" : ""}
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Always required
                      </span>
                      <span>
                        {chartValueMode === "percentage"
                          ? `${point.atemporalPct.toFixed(1)}%`
                          : formatCurrency(atemporalAmount, baseCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Timed required
                      </span>
                      <span>
                        {chartValueMode === "percentage"
                          ? `${point.temporalPct.toFixed(1)}%`
                          : formatCurrency(temporalAmount, baseCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span style={{ color: "#2563eb" }}>Exploration</span>
                      <span className="font-bold">
                        {chartValueMode === "percentage"
                          ? `${point.discretionaryPct.toFixed(1)}%`
                          : formatCurrency(discretionaryAmount, baseCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Income</span>
                      <span>
                        {chartValueMode === "percentage"
                          ? `${point.incomePct.toFixed(1)}%`
                          : formatCurrency(incomeAmount, baseCurrency)}
                      </span>
                    </div>
                    {chartIsCapped && (
                      <div className="text-muted-foreground pt-1 text-xs">
                        Chart view capped for readability.
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Area
              dataKey={
                chartValueMode === "percentage"
                  ? "atemporalPct"
                  : "cappedAtemporalAmount"
              }
              name="Always required"
              type="bump"
              fill="#52525b"
              fillOpacity={0.6}
              stroke="none"
              stackId="capacity"
            />
            <Area
              dataKey={
                chartValueMode === "percentage"
                  ? "temporalPct"
                  : "cappedTemporalAmount"
              }
              name="Timed required"
              type="bump"
              fill="#71717a"
              fillOpacity={0.5}
              stroke="none"
              stackId="capacity"
            />
            <Area
              dataKey={
                chartValueMode === "percentage"
                  ? "discretionaryPct"
                  : "cappedDiscretionaryAmount"
              }
              name="Exploration capital"
              type="bump"
              fill="#2563eb"
              fillOpacity={0.2}
              stroke="none"
              stackId="capacity"
            />
            {chartValueMode === "percentage" && (
              <>
                <Line
                  dataKey="avgDiscretionaryPctGuide"
                  name="Avg exploration"
                  type="linear"
                  stroke="#2563eb"
                  strokeDasharray="8 4"
                  strokeOpacity={0.95}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="avgAtemporalPctGuide"
                  name="Avg always required"
                  type="linear"
                  stroke="#a1a1aa"
                  strokeDasharray="6 4"
                  strokeOpacity={0.95}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="avgRequiredPctGuide"
                  name="Avg required"
                  type="linear"
                  stroke="#d4d4d8"
                  strokeDasharray="3 5"
                  strokeOpacity={1}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="avgIncomePctGuide"
                  name="Avg income"
                  type="linear"
                  stroke="#22c55e"
                  strokeDasharray="8 4"
                  strokeOpacity={0.9}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </>
            )}
            {chartValueMode === "absolute" && (
              <>
                <Line
                  dataKey="cappedDiscretionaryGuideAmount"
                  name="Avg exploration"
                  type="linear"
                  stroke="#2563eb"
                  strokeDasharray="8 4"
                  strokeOpacity={0.95}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="cappedAtemporalGuideAmount"
                  name="Avg always required"
                  type="linear"
                  stroke="#d4d4d8"
                  strokeDasharray="6 4"
                  strokeOpacity={1}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="cappedRequiredGuideAmount"
                  name="Avg required"
                  type="linear"
                  stroke="#f5f5f5"
                  strokeDasharray="3 5"
                  strokeOpacity={1}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="cappedIncomeGuideAmount"
                  name="Avg income"
                  type="linear"
                  stroke="#22c55e"
                  strokeDasharray="8 4"
                  strokeOpacity={0.7}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </>
            )}
            {lastHistoricalMonth && (
              <ReferenceLine
                x={lastHistoricalMonth}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                isFront
                label={{ value: "Today", position: "top" }}
              />
            )}
            {chartValueMode === "percentage" && (
              <>
                <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.55} strokeWidth={1.5} isFront />
                <ReferenceLine y={40} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.55} strokeWidth={1.5} isFront />
                <ReferenceLine y={60} stroke="#60a5fa" strokeDasharray="4 4" strokeOpacity={0.4} strokeWidth={1.5} isFront />
              </>
            )}
            {chartValueMode === "absolute" && (
              <>
                <ReferenceLine
                  y={chartData[0]?.cappedAtemporalGuideAmount ?? 0}
                  stroke="#d4d4d8"
                  strokeDasharray="6 4"
                  strokeOpacity={1}
                  strokeWidth={1.5}
                  isFront
                  label={{
                    value: `Avg always required ${formatCurrency(avgAtemporalAmount, baseCurrency)}`,
                    position: "insideTopLeft",
                    fontSize: 10,
                    fill: "#d4d4d8",
                  }}
                />
                <ReferenceLine
                  y={chartData[0]?.cappedRequiredGuideAmount ?? 0}
                  stroke="#f5f5f5"
                  strokeDasharray="3 5"
                  strokeOpacity={1}
                  strokeWidth={1.5}
                  isFront
                  label={{
                    value: `Avg required ${formatCurrency(avgAtemporalAmount + avgTemporalAmount, baseCurrency)}`,
                    position: "insideTopLeft",
                    fontSize: 10,
                    fill: "#f5f5f5",
                  }}
                />
                <ReferenceLine
                  y={chartData[0]?.cappedIncomeGuideAmount ?? 0}
                  stroke="#22c55e"
                  strokeDasharray="8 4"
                  strokeOpacity={0.7}
                  strokeWidth={1.5}
                  isFront
                  label={{
                    value: `Avg income ${formatCurrency(avgIncomeAmount, baseCurrency)}`,
                    position: "insideTopLeft",
                    fontSize: 10,
                    fill: "#22c55e",
                  }}
                />
              </>
            )}
            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-center justify-between gap-4">
          <TrendingIndicator
            percentageChange={percentageChange}
            startDate={chartData[0]?.month}
            endDate={
              lastHistoricalMonth ?? chartData[chartData.length - 1]?.month
            }
          />
          <div className="text-right">
            <div className="text-muted-foreground text-xs tracking-wide uppercase">
              Current zone
            </div>
            <div className="font-medium" style={{ color: explorationColor }}>
              {statusLabel}
            </div>
            <div className="text-muted-foreground text-xs">
              Avg exploration{" "}
              {chartValueMode === "percentage"
                ? `${avgDiscretionaryPct.toFixed(0)}%`
                : formatCurrency(avgDiscretionaryAmount, baseCurrency)}
            </div>
            <div className="text-muted-foreground text-xs">
              Avg always required{" "}
              {chartValueMode === "percentage"
                ? `${avgAtemporalPct.toFixed(0)}%`
                : formatCurrency(avgAtemporalAmount, baseCurrency)}
            </div>
            <div className="text-muted-foreground text-xs">
              Avg timed required{" "}
              {chartValueMode === "percentage"
                ? `${avgTemporalPct.toFixed(0)}%`
                : formatCurrency(avgTemporalAmount, baseCurrency)}
            </div>
            <div className="text-muted-foreground text-xs">
              Avg income{" "}
              {chartValueMode === "percentage"
                ? `${avgIncomePct.toFixed(0)}%`
                : formatCurrency(avgIncomeAmount, baseCurrency)}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
