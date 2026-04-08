"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { useChartControls } from "@/components/charts/shared/chart-controls-context";
import {
  useCurrency,
  useRealEstateAssets,
  useWallets,
} from "@/contexts/settings-context";
import { useTotalBalance } from "@/hooks/use-total-balance";
import { calculateTrimmedMean } from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { computeDownshiftTarget, computeFireTarget } from "@/utils/fire-plan";
import { createClient } from "@/utils/supabase/client";
import {
  getMonthlyStats,
  listRealEstateAssetValuations,
} from "@/utils/supabase/queries";

interface UseFirePlanDataParams {
  walletId?: string;
  from?: string;
  to?: string;
}

type AssetHistoryPoint = {
  date: string;
  value: number;
};

export function useFirePlanData({
  walletId,
  from,
  to,
}: UseFirePlanDataParams) {
  const { totalBalance } = useTotalBalance();
  const { conversionRates, baseCurrency } = useCurrency();
  const [wallets, walletMap] = useWallets();
  const [realEstateAssets, realEstateAssetsMap] = useRealEstateAssets();
  const controls = useChartControls();

  const workspaceWalletIds = useMemo(() => wallets.map((wallet) => wallet.id), [wallets]);
  const activeAssetIds = useMemo(
    () =>
      realEstateAssets
        .filter((asset) => asset.status === "active")
        .map((asset) => asset.id),
    [realEstateAssets],
  );

  const { data: monthlyStats = [], isLoading: loadingMonthlyStats } = useQuery({
    queryKey: [
      "fire-plan-monthly-stats",
      walletId,
      workspaceWalletIds.join(","),
      from,
      to,
      baseCurrency,
    ],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getMonthlyStats(supabase, {
        walletId,
        workspaceWalletIds,
        from,
        to,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: assetValuations = [], isLoading: loadingAssetValuations } =
    useQuery({
      queryKey: [
        "fire-plan-asset-valuations",
        activeAssetIds.join(","),
        baseCurrency,
      ],
      queryFn: async () => {
        if (activeAssetIds.length === 0) return [];
        const supabase = await createClient();
        const { data, error } = await listRealEstateAssetValuations(supabase, {
          assetIds: activeAssetIds,
        });
        if (error) throw error;
        return data ?? [];
      },
      enabled: activeAssetIds.length > 0,
    });

  const historicalNetMonthlySavings = useMemo(() => {
    if (monthlyStats.length === 0) return 0;

    const incomeByMonth: Record<string, number> = {};
    const expenseByMonth: Record<string, number> = {};

    monthlyStats.forEach((stat) => {
      if (!incomeByMonth[stat.month]) incomeByMonth[stat.month] = 0;
      if (!expenseByMonth[stat.month]) expenseByMonth[stat.month] = 0;

      const wallet = walletMap.get(stat.wallet_id ?? "");
      const currency = wallet?.currency ?? baseCurrency;

      incomeByMonth[stat.month] +=
        convertCurrency(
          stat.income_cents,
          currency,
          baseCurrency,
          conversionRates,
        ) / 100;
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

    const avgIncome = calculateTrimmedMean(
      Object.values(incomeByMonth).filter((value) => value > 0),
    );
    const avgExpense = calculateTrimmedMean(
      Object.values(expenseByMonth).filter((value) => value > 0),
    );

    return avgIncome - avgExpense;
  }, [baseCurrency, conversionRates, monthlyStats, walletMap]);

  const averageMonthlyIncome = useMemo(() => {
    if (monthlyStats.length === 0) return 0;

    const incomeByMonth: Record<string, number> = {};

    monthlyStats.forEach((stat) => {
      if (!incomeByMonth[stat.month]) incomeByMonth[stat.month] = 0;

      const wallet = walletMap.get(stat.wallet_id ?? "");
      const currency = wallet?.currency ?? baseCurrency;

      incomeByMonth[stat.month] +=
        convertCurrency(
          stat.income_cents,
          currency,
          baseCurrency,
          conversionRates,
        ) / 100;
    });

    return calculateTrimmedMean(
      Object.values(incomeByMonth).filter((value) => value > 0),
    );
  }, [baseCurrency, conversionRates, monthlyStats, walletMap]);

  const assetHistory = useMemo<AssetHistoryPoint[]>(() => {
    if (assetValuations.length === 0) return [];

    const sorted = [...assetValuations].sort((a, b) => {
      if (a.valuation_date === b.valuation_date) {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      return (
        new Date(a.valuation_date).getTime() - new Date(b.valuation_date).getTime()
      );
    });

    const groupedByDate = new Map<string, typeof sorted>();
    sorted.forEach((valuation) => {
      const current = groupedByDate.get(valuation.valuation_date) ?? [];
      current.push(valuation);
      groupedByDate.set(valuation.valuation_date, current);
    });

    const latestByAsset = new Map<string, number>();
    const points: AssetHistoryPoint[] = [];

    Array.from(groupedByDate.entries()).forEach(([date, valuations]) => {
      valuations.forEach((valuation) => {
        const asset = realEstateAssetsMap.get(valuation.asset_id);
        const currency = asset?.currency ?? baseCurrency;
        latestByAsset.set(
          valuation.asset_id,
          convertCurrency(
            valuation.valuation_amount_cents,
            currency,
            baseCurrency,
            conversionRates,
          ) / 100,
        );
      });

      points.push({
        date,
        value: Array.from(latestByAsset.values()).reduce(
          (sum, value) => sum + value,
          0,
        ),
      });
    });

    return points;
  }, [
    assetValuations,
    baseCurrency,
    conversionRates,
    realEstateAssetsMap,
  ]);

  const effectiveMonthlySpend = controls?.effectiveMonthlySpend ?? 0;
  const selectedWR = controls?.selectedWR ?? 0.035;
  const targetLowerMonthlyIncome = controls?.targetLowerMonthlyIncome ?? 0;
  const investableBalance = totalBalance / 100;
  const contextualAssetValue =
    assetHistory.length > 0 ? assetHistory[assetHistory.length - 1].value : 0;
  const fullFireNumber = computeFireTarget(effectiveMonthlySpend, selectedWR);
  const downshiftFireNumber = computeDownshiftTarget(
    effectiveMonthlySpend,
    targetLowerMonthlyIncome,
    selectedWR,
  );

  return {
    assetHistory,
    averageMonthlyIncome,
    baseCurrency,
    conversionRates,
    contextualAssetValue,
    downshiftFireNumber,
    effectiveMonthlySpend,
    fullFireNumber,
    hasContextualAssets: contextualAssetValue > 0,
    historicalNetMonthlySavings,
    investableBalance,
    isLoading: loadingMonthlyStats || loadingAssetValuations,
    currentSavingsRate:
      averageMonthlyIncome > 0
        ? Math.max(0, historicalNetMonthlySavings / averageMonthlyIncome)
        : 0,
    selectedWR,
    targetLowerMonthlyIncome,
    workspaceWalletIds,
  };
}
