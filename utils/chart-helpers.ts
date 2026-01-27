import { addMonths, format, isAfter, isBefore, parseISO } from "date-fns";

import { convertCurrency, convertToBaseCurrency } from "@/utils/currency-conversion";
import { RecurringTransaction, Wallet } from "@/utils/supabase/types";
import { calculateNextRunDate } from "@/utils/recurring-transaction";

export interface MonthlyBalance {
  month: string;
  balance_cents: number;
  wallet_id: string;
}

export interface ChartDataPoint {
  month: string;
  [walletId: string]: number | string;
}

/**
 * Helper function for YAxis tick formatting since it can't use React components
 */
export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Calculate monthly totals from wallet monthly balances
 * Converts balances to base currency and groups by month and wallet
 */
export function calculateMonthlyTotals(
  monthlyBalances: MonthlyBalance[],
  conversionRates: Record<string, { rate: number }>,
  baseCurrency: string,
  walletMap: Map<string, Wallet>,
  walletId?: string,
): ChartDataPoint[] {
  // Convert all balances to base currency
  const convertedBalances = convertToBaseCurrency(
    monthlyBalances.map((balance) => ({
      amount_cents: balance.balance_cents,
      wallet_id: balance.wallet_id,
      month: balance.month,
    })),
    conversionRates,
    baseCurrency,
    walletMap,
  );

  // Group by month and wallet
  const groupedByMonthAndWallet = convertedBalances.reduce(
    (acc, { month, amount_cents, wallet_id }) => {
      if (!acc[month]) {
        acc[month] = {};
      }
      if (wallet_id) {
        acc[month][wallet_id] = (acc[month][wallet_id] || 0) + amount_cents;
      }
      return acc;
    },
    {} as Record<string, Record<string, number>>,
  );

  // Convert to array and sort by month
  const chartData: ChartDataPoint[] = Object.entries(groupedByMonthAndWallet)
    .map(([month, balances]) => ({
      month,
      ...Object.entries(balances).reduce(
        (acc, [walletId, balance_cents]) => ({
          ...acc,
          [walletId]: balance_cents / 100,
        }),
        {} as Record<string, number>,
      ),
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // If filtering by a specific wallet, ensure all data points have that wallet's data
  if (walletId) {
    return chartData.map((dataPoint) => ({
      ...dataPoint,
      [walletId]: dataPoint[walletId] || 0,
    }));
  }

  return chartData;
}

export interface MonthlyStats {
  month: string;
  income_cents: number;
  outcome_cents: number;
  net_cents: number;
  wallet_id: string;
}

/**
 * Calculate weighted trend from recent months using exponential weighting
 * More recent months have higher weight
 */
export function calculateWeightedTrend(
  historicalData: ChartDataPoint[],
  visibleWallets: Array<{ id: string }>,
  lookbackMonths: number = 12,
): Record<string, number> {
  if (historicalData.length < 2) {
    return {};
  }

  // Take last N months (or all if less than N)
  const recentData = historicalData.slice(-lookbackMonths);
  if (recentData.length < 2) {
    return {};
  }

  const avgChanges: Record<string, number> = {};

  visibleWallets.forEach((wallet) => {
    // Calculate monthly changes
    const changes: number[] = [];
    for (let i = 1; i < recentData.length; i++) {
      const prevBalance =
        (recentData[i - 1][wallet.id] as number | undefined) || 0;
      const currBalance =
        (recentData[i][wallet.id] as number | undefined) || 0;
      changes.push(currBalance - prevBalance);
    }

    // Apply exponential weighting (more recent = higher weight)
    let weightedSum = 0;
    let weightSum = 0;
    const alpha = 0.3; // Exponential smoothing factor

    changes.forEach((change, index) => {
      // Weight increases exponentially for more recent data
      const weight = Math.exp(alpha * (index - changes.length + 1));
      weightedSum += change * weight;
      weightSum += weight;
    });

    avgChanges[wallet.id] = weightSum > 0 ? weightedSum / weightSum : 0;
  });

  return avgChanges;
}

/**
 * Project recurring transactions into future months
 */
export function projectRecurringTransactions(
  recurringTransactions: RecurringTransaction[],
  conversionRates: Record<string, { rate: number }>,
  baseCurrency: string,
  walletMap: Map<string, Wallet>,
  startMonth: Date,
  monthsAhead: number,
  walletId?: string,
): Record<string, Record<string, number>> {
  // Structure: month -> wallet_id -> amount
  const projections: Record<string, Record<string, number>> = {};

  const endMonth = addMonths(startMonth, monthsAhead);

  recurringTransactions.forEach((recurring) => {
    // Filter by wallet if specified
    if (walletId && recurring.wallet_id !== walletId) {
      return;
    }

    const wallet = walletMap.get(recurring.wallet_id);
    if (!wallet) return;

    // Convert amount to base currency
    const amountInBase = convertCurrency(
      recurring.amount_cents,
      recurring.currency,
      baseCurrency,
      conversionRates,
    ) / 100;

    // Determine if it's income or expense
    // Check type field first (if available), then fall back to category type
    const type = (recurring as any).type || recurring.categories?.type;
    const isIncome = type === "income";
    const amount = isIncome ? amountInBase : -amountInBase;

    // Start from start_date or next_run_date
    let currentDate = new Date(recurring.next_run_date || recurring.start_date);
    const endDate = recurring.end_date ? new Date(recurring.end_date) : null;

    // Project for each month
    while (isBefore(currentDate, endMonth) && (!endDate || isBefore(currentDate, endDate))) {
      const monthKey = format(currentDate, "yyyy-MM-dd");

      if (!projections[monthKey]) {
        projections[monthKey] = {};
      }

      if (!projections[monthKey][recurring.wallet_id]) {
        projections[monthKey][recurring.wallet_id] = 0;
      }

      projections[monthKey][recurring.wallet_id] += amount;

      // Move to next occurrence
      currentDate = calculateNextRunDate(currentDate, recurring.interval_type);
    }
  });

  return projections;
}

/**
 * Forecast income and expenses separately using monthly stats
 */
export function forecastIncomeExpense(
  monthlyStats: MonthlyStats[],
  conversionRates: Record<string, { rate: number }>,
  baseCurrency: string,
  walletMap: Map<string, Wallet>,
  lookbackMonths: number = 12,
  walletId?: string,
): {
  avgIncomeChange: number;
  avgExpenseChange: number;
} {
  if (monthlyStats.length < 2) {
    return { avgIncomeChange: 0, avgExpenseChange: 0 };
  }

  // Filter by wallet if specified
  let filteredStats = monthlyStats;
  if (walletId) {
    filteredStats = monthlyStats.filter((s) => s.wallet_id === walletId);
  }

  // Take last N months
  const recentStats = filteredStats.slice(-lookbackMonths);
  if (recentStats.length < 2) {
    return { avgIncomeChange: 0, avgExpenseChange: 0 };
  }

  // Group by month and convert to base currency
  const byMonth: Record<string, { income: number; expense: number }> = {};

  recentStats.forEach((stat) => {
    if (!byMonth[stat.month]) {
      byMonth[stat.month] = { income: 0, expense: 0 };
    }

    // Convert income and expense separately
    const wallet = walletMap.get(stat.wallet_id);
    if (wallet) {
      const incomeInBase = convertCurrency(
        stat.income_cents,
        wallet.currency,
        baseCurrency,
        conversionRates,
      ) / 100;
      const expenseInBase = convertCurrency(
        stat.outcome_cents,
        wallet.currency,
        baseCurrency,
        conversionRates,
      ) / 100;
      byMonth[stat.month].income += incomeInBase;
      byMonth[stat.month].expense += expenseInBase;
    }
  });

  const months = Object.keys(byMonth).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );
  if (months.length < 2) {
    return { avgIncomeChange: 0, avgExpenseChange: 0 };
  }

  // Calculate monthly changes with exponential weighting
  const incomeChanges: number[] = [];
  const expenseChanges: number[] = [];

  for (let i = 1; i < months.length; i++) {
    const prevMonth = byMonth[months[i - 1]];
    const currMonth = byMonth[months[i]];
    incomeChanges.push(currMonth.income - prevMonth.income);
    expenseChanges.push(currMonth.expense - prevMonth.expense);
  }

  // Weighted average
  const alpha = 0.3;
  let incomeWeightedSum = 0;
  let expenseWeightedSum = 0;
  let weightSum = 0;

  incomeChanges.forEach((change, index) => {
    const weight = Math.exp(alpha * (index - incomeChanges.length + 1));
    incomeWeightedSum += change * weight;
    weightSum += weight;
  });

  expenseChanges.forEach((change, index) => {
    const weight = Math.exp(alpha * (index - expenseChanges.length + 1));
    expenseWeightedSum += change * weight;
  });

  return {
    avgIncomeChange: weightSum > 0 ? incomeWeightedSum / weightSum : 0,
    avgExpenseChange: weightSum > 0 ? expenseWeightedSum / weightSum : 0,
  };
}

/**
 * Calculate trimmed mean (removes top and bottom percentiles)
 * More robust than simple mean against outliers
 * Falls back to simple mean if insufficient data points
 *
 * @param values - Array of numbers to calculate trimmed mean from
 * @param trimPercentage - Percentage to trim from each end (default 0.05 = 5%)
 * @returns Trimmed mean value
 */
export function calculateTrimmedMean(
  values: number[],
  trimPercentage: number = 0.05,
): number {
  if (values.length === 0) return 0;

  // Need at least 4 data points to trim (remove at least 1 from each end)
  if (values.length < 4) {
    // Fall back to simple mean
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Sort values
  const sorted = [...values].sort((a, b) => a - b);

  // Calculate how many values to trim from each end
  const trimCount = Math.floor(sorted.length * trimPercentage);

  // Remove trimmed values
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

  // Calculate mean of remaining values
  return trimmed.reduce((sum, val) => sum + val, 0) / trimmed.length;
}

/**
 * Safely parse a month date string (YYYY-MM-DD) without timezone issues.
 *
 * Month dates from the database are in YYYY-MM-DD format representing the first day
 * of the month. Using new Date() directly can cause timezone issues where the date
 * gets converted to the previous day in local timezones west of UTC.
 *
 * @param monthString - Date string in YYYY-MM-DD format (e.g., "2024-01-01")
 * @returns Date object representing the month in local timezone
 *
 * @example
 * // Instead of: format(new Date("2024-01-01"), "MMMM yyyy")
 * // Use: format(parseMonthDate("2024-01-01"), "MMMM yyyy")
 */
export function parseMonthDate(monthString: string): Date {
  const [year, month, day] = monthString.split('-').map(Number);
  // Create date in local timezone (month is 0-indexed in JS)
  return new Date(year, month - 1, day);
}

