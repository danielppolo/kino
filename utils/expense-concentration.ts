import {
  convertCurrency,
  CurrencyConversion,
} from "@/utils/currency-conversion";

type WalletCurrency = {
  currency: string;
};

type ExpenseCategoryRow = {
  category_id: string | null;
  outcome_cents: number | null;
  wallet_id: string | null;
  categories?: {
    name?: string | null;
  } | null;
};

export type ExpenseConcentrationItem = {
  category_id: string;
  category_name: string;
  total_cents: number;
  percentage: number;
};

export function buildExpenseConcentrationData({
  rows,
  walletMap,
  conversionRates,
  baseCurrency,
  topN = 5,
}: {
  rows: ExpenseCategoryRow[];
  walletMap: Map<string, WalletCurrency>;
  conversionRates: Record<string, { rate: number } | CurrencyConversion>;
  baseCurrency: string;
  topN?: number;
}): ExpenseConcentrationItem[] {
  const categoryTotals: Record<string, { name: string; total: number }> = {};

  rows.forEach((row) => {
    if (!row.category_id || !row.wallet_id) return;

    const wallet = walletMap.get(row.wallet_id);
    if (!wallet) return;

    const total = convertCurrency(
      Math.abs(row.outcome_cents ?? 0),
      wallet.currency,
      baseCurrency,
      conversionRates,
    );

    if (!categoryTotals[row.category_id]) {
      categoryTotals[row.category_id] = {
        name: row.categories?.name || "Unknown",
        total: 0,
      };
    }

    categoryTotals[row.category_id].total += total;
  });

  const totalExpenses = Object.values(categoryTotals).reduce(
    (sum, category) => sum + category.total,
    0,
  );

  const sorted = Object.entries(categoryTotals)
    .map(([id, data]) => ({
      category_id: id,
      category_name: data.name,
      total_cents: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total_cents - a.total_cents);

  const result = sorted.slice(0, topN);
  const otherCategories = sorted.slice(topN);

  if (otherCategories.length === 0) {
    return result;
  }

  const otherTotal = otherCategories.reduce(
    (sum, category) => sum + category.total_cents,
    0,
  );

  return [
    ...result,
    {
      category_id: "other",
      category_name: "Other",
      total_cents: otherTotal,
      percentage: totalExpenses > 0 ? (otherTotal / totalExpenses) * 100 : 0,
    },
  ];
}
