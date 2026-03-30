"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { useCurrency, useWallets } from "@/contexts/settings-context";
import {
  calculateTrimmedMean,
  CHART_NORMALIZATION_PRESETS,
  ChartNormalizationPreset,
} from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyCategoryStats, getMonthlyStats } from "@/utils/supabase/queries";

interface ChartControlsProviderProps {
  children: React.ReactNode;
  from?: string;
  to?: string;
  walletId?: string;
}

interface ChartControlsContextValue {
  monthlySpend: number | null;
  setMonthlySpend: (value: number) => void;
  defaultMonthlySpend: number;
  defaultRequiredSpend: number;
  effectiveMonthlySpend: number;
  forecastSpendMode: "required-spend" | "historical-average" | "custom";
  setForecastSpendMode: (
    value: "required-spend" | "historical-average" | "custom",
  ) => void;
  futureLumpSum: number;
  setFutureLumpSum: (value: number) => void;
  peakNormalization: ChartNormalizationPreset;
  setPeakNormalization: (value: ChartNormalizationPreset) => void;
  peakNormalizationPercentile: number;
  forecastHorizonYears: number;
  setForecastHorizonYears: (value: number) => void;
  forecastMode: "with-income" | "no-income";
  setForecastMode: (value: "with-income" | "no-income") => void;
  chartValueMode: "percentage" | "absolute";
  setChartValueMode: (value: "percentage" | "absolute") => void;
}

const ChartControlsContext = createContext<ChartControlsContextValue | null>(
  null,
);
const CHART_SPEND_SLIDER_MAX = 100000;
const CHART_SPEND_SLIDER_STEP = 10000;
const DEFAULT_CHART_MONTHLY_SPEND = 30000;
const DEFAULT_PEAK_NORMALIZATION: ChartNormalizationPreset = "strong";
const DEFAULT_FORECAST_HORIZON_YEARS = 1;
const DEFAULT_FORECAST_MODE = "with-income";
const DEFAULT_FUTURE_LUMP_SUM = 0;
const DEFAULT_CHART_VALUE_MODE = "percentage";
const DEFAULT_FORECAST_SPEND_MODE = "historical-average";

export function ChartControlsProvider({
  children,
  from,
  to,
  walletId,
}: ChartControlsProviderProps) {
  const [, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();
  const [monthlySpend, setMonthlySpend] =
    useState<number | null>(DEFAULT_CHART_MONTHLY_SPEND);
  const [futureLumpSum, setFutureLumpSum] = useState(DEFAULT_FUTURE_LUMP_SUM);
  const [forecastSpendMode, setForecastSpendMode] = useState<
    "required-spend" | "historical-average" | "custom"
  >(DEFAULT_FORECAST_SPEND_MODE);
  const [peakNormalization, setPeakNormalization] =
    useState<ChartNormalizationPreset>(DEFAULT_PEAK_NORMALIZATION);
  const [forecastHorizonYears, setForecastHorizonYears] = useState(
    DEFAULT_FORECAST_HORIZON_YEARS,
  );
  const [forecastMode, setForecastMode] = useState<"with-income" | "no-income">(
    DEFAULT_FORECAST_MODE,
  );
  const [chartValueMode, setChartValueMode] = useState<
    "percentage" | "absolute"
  >(DEFAULT_CHART_VALUE_MODE);

  const { data: monthlyStats } = useQuery({
    queryKey: ["chart-controls-stats", walletId, from, to, baseCurrency],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyStats(supabase, {
        walletId,
        from,
        to,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: monthlyCategoryStats } = useQuery({
    queryKey: [
      "chart-controls-category-stats",
      walletId,
      from,
      to,
      baseCurrency,
    ],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyCategoryStats(supabase, {
        walletId,
        from,
        to,
        type: "expense",
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const defaultMonthlySpend = useMemo(() => {
    if (!monthlyStats || monthlyStats.length === 0) {
      return 0;
    }

    const expenseByMonth: Record<string, number> = {};
    monthlyStats.forEach((stat) => {
      if (!expenseByMonth[stat.month]) {
        expenseByMonth[stat.month] = 0;
      }

      const wallet = walletMap.get(stat.wallet_id ?? "");
      const currency = wallet?.currency ?? baseCurrency;
      expenseByMonth[stat.month] +=
        Math.abs(
          convertCurrency(
            stat.outcome_cents,
            currency,
            baseCurrency,
            conversionRates,
          ),
        ) / 100;
    });

    const monthlyExpenseTotals = Object.values(expenseByMonth).filter(
      (value) => value > 0,
    );
    return calculateTrimmedMean(monthlyExpenseTotals);
  }, [monthlyStats, walletMap, baseCurrency, conversionRates]);

  const defaultRequiredSpend = useMemo(() => {
    if (!monthlyCategoryStats || monthlyCategoryStats.length === 0) {
      return 0;
    }

    const atemporalByMonth: Record<string, number> = {};
    monthlyCategoryStats.forEach((stat) => {
      if (stat.categories?.required_spend_kind !== "atemporal") {
        return;
      }

      if (!atemporalByMonth[stat.month]) {
        atemporalByMonth[stat.month] = 0;
      }

      const wallet = walletMap.get(stat.wallet_id ?? "");
      const currency = wallet?.currency ?? baseCurrency;
      atemporalByMonth[stat.month] +=
        Math.abs(
          convertCurrency(
            stat.outcome_cents,
            currency,
            baseCurrency,
            conversionRates,
          ),
        ) / 100;
    });

    return calculateTrimmedMean(
      Object.values(atemporalByMonth).filter((value) => value > 0),
    );
  }, [monthlyCategoryStats, walletMap, baseCurrency, conversionRates]);

  const effectiveMonthlySpend = useMemo(() => {
    switch (forecastSpendMode) {
      case "required-spend":
        return defaultRequiredSpend;
      case "custom":
        return monthlySpend ?? defaultMonthlySpend;
      case "historical-average":
      default:
        return defaultMonthlySpend;
    }
  }, [
    defaultMonthlySpend,
    defaultRequiredSpend,
    forecastSpendMode,
    monthlySpend,
  ]);

  useEffect(() => {
    if (defaultMonthlySpend > 0 && monthlySpend === null) {
      const snapped =
        Math.round(defaultMonthlySpend / CHART_SPEND_SLIDER_STEP) *
        CHART_SPEND_SLIDER_STEP;
      setMonthlySpend(
        Math.max(0, Math.min(CHART_SPEND_SLIDER_MAX, snapped)),
      );
    }
  }, [defaultMonthlySpend, monthlySpend]);

  const value = useMemo<ChartControlsContextValue>(
    () => ({
      monthlySpend,
      setMonthlySpend,
      defaultMonthlySpend,
      defaultRequiredSpend,
      effectiveMonthlySpend,
      forecastSpendMode,
      setForecastSpendMode,
      futureLumpSum,
      setFutureLumpSum,
      peakNormalization,
      setPeakNormalization,
      peakNormalizationPercentile:
        CHART_NORMALIZATION_PRESETS[peakNormalization].percentile,
      forecastHorizonYears,
      setForecastHorizonYears,
      forecastMode,
      setForecastMode,
      chartValueMode,
      setChartValueMode,
    }),
    [
      monthlySpend,
      defaultMonthlySpend,
      defaultRequiredSpend,
      effectiveMonthlySpend,
      forecastSpendMode,
      futureLumpSum,
      peakNormalization,
      setPeakNormalization,
      forecastHorizonYears,
      forecastMode,
      chartValueMode,
    ],
  );

  return (
    <ChartControlsContext.Provider value={value}>
      {children}
    </ChartControlsContext.Provider>
  );
}

export function useChartControls() {
  return useContext(ChartControlsContext);
}
