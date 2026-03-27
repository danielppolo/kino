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
import { getMonthlyStats } from "@/utils/supabase/queries";

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
  peakNormalization: ChartNormalizationPreset;
  setPeakNormalization: (value: ChartNormalizationPreset) => void;
  peakNormalizationPercentile: number;
}

const ChartControlsContext = createContext<ChartControlsContextValue | null>(null);
const CHART_SPEND_SLIDER_MAX = 100000;
const CHART_SPEND_SLIDER_STEP = 10000;
const DEFAULT_CHART_MONTHLY_SPEND = 30000;
const DEFAULT_PEAK_NORMALIZATION: ChartNormalizationPreset = "strong";

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
  const [peakNormalization, setPeakNormalization] =
    useState<ChartNormalizationPreset>(DEFAULT_PEAK_NORMALIZATION);

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
      peakNormalization,
      setPeakNormalization,
      peakNormalizationPercentile:
        CHART_NORMALIZATION_PRESETS[peakNormalization].percentile,
    }),
    [
      monthlySpend,
      defaultMonthlySpend,
      peakNormalization,
      setPeakNormalization,
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
