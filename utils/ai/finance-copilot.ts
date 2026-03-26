import { addMonths, format } from "date-fns";
import { z } from "zod";

import {
  calculateMonthlyTotals,
  findRecoveryStartIndex,
  forecastHoltWinters,
  winsorize,
} from "@/utils/chart-helpers";
import { convertCurrency } from "@/utils/currency-conversion";
import { fetchAllConversions } from "@/utils/fetch-conversions-server";
import {
  type Filters,
  getBillBurdenRatio,
  getCashFlowAfterBills,
  getCashflowBreakdown,
  getCurrencyExposure,
  getExpenseConcentration,
  getMonthlyStats,
  getTransactionSizeDistribution,
  getWalletMonthlyBalances,
  getWalletMonthlyOwed,
  listTransactions,
  listWallets,
} from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";
import type { Wallet } from "@/utils/supabase/types";

export interface FinanceChatEvidence {
  label: string;
  value: string;
  detail: string;
}

export interface FinanceChatReply {
  answer: string;
  confidence: "low" | "medium" | "high";
  recommendations: string[];
  risks: string[];
  evidence: FinanceChatEvidence[];
  followUpQuestions: string[];
}

export interface FinancialBriefing {
  generatedAt: string;
  scope: {
    workspaceId: string;
    workspaceName: string;
    baseCurrency: string;
    timezone: string;
    walletId?: string;
    walletNames: string[];
    from?: string;
    to?: string;
  };
  currentPosition: {
    totalBalanceCents: number;
    totalOwedCents: number;
    totalCashflowCents: number;
    totalIncomeCents: number;
    totalExpenseCents: number;
    balanceByWallet: Array<{
      walletId: string;
      walletName: string;
      currency: string;
      balanceCents: number;
      balanceInBaseCents: number;
      owedInBaseCents: number;
    }>;
  };
  historical: {
    monthsAvailable: number;
    monthlyNet: Array<{
      month: string;
      incomeCents: number;
      expenseCents: number;
      netCents: number;
    }>;
    trailing: {
      avgIncomeCents: number;
      avgExpenseCents: number;
      avgNetCents: number;
      last3MonthsNetCents: number;
      last6MonthsNetCents: number;
      last12MonthsNetCents: number;
      netVolatilityCents: number;
    };
  };
  forecast: {
    trainingMonths: number;
    confidence: "low" | "medium" | "high";
    recoveryDetected: boolean;
    currentBalanceCents: number;
    months: Array<{
      month: string;
      projectedBalanceCents: number;
      projectedNetChangeCents: number;
    }>;
  };
  composition: {
    topExpenseCategories: Array<{
      name: string;
      totalCents: number;
      percentage: number;
    }>;
    currencyExposure: Array<{
      currency: string;
      transactionCount: number;
      totalAmountCents: number;
    }>;
    expenseSizeDistribution: Array<{
      range: string;
      count: number;
      totalAmountCents: number;
    }>;
    latestBillBurdenPercent: number | null;
    latestNetAfterBillsCents: number | null;
  };
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string | null;
    type: string | null;
    walletName: string;
    amountCents: number;
    amountInBaseCents: number;
  }>;
  notableSignals: string[];
}

interface WorkspaceContext {
  workspace: {
    id: string;
    name: string;
    base_currency: string | null;
  };
  wallets: Wallet[];
}

export interface FinancialBriefingScope {
  walletId?: string;
  from?: string;
  to?: string;
  timezone?: string;
}

export interface FinancialToolContext {
  briefing: FinancialBriefing;
  context: WorkspaceContext;
  scope: FinancialBriefingScope;
}

type BillInsightsResult = {
  latestBillBurdenPercent: number | null;
  latestNetAfterBillsCents: number | null;
};

const ToolScopeSchema = z.object({
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const GetTransactionsArgsSchema = z.object({
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  categoryId: z.string().optional(),
  labelId: z.string().optional(),
  tag: z.string().optional(),
  type: z.enum(["income", "expense", "transfer"]).optional(),
  description: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(8),
});

const CategoryDrilldownArgsSchema = z.object({
  categoryId: z.string(),
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(8),
});

const ForecastDetailsArgsSchema = z.object({
  horizonMonths: z.number().int().min(1).max(6).default(6),
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const BillOverviewArgsSchema = z.object({
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance));
}

function sumLast(values: number[], count: number) {
  return values.slice(-count).reduce((sum, value) => sum + value, 0);
}

function toBaseCents(
  amountCents: number,
  walletId: string,
  walletMap: Map<string, Wallet>,
  baseCurrency: string,
  conversionRates: Record<string, { rate: number }>,
) {
  const wallet = walletMap.get(walletId);
  const currency = wallet?.currency ?? baseCurrency;
  return convertCurrency(amountCents, currency, baseCurrency, conversionRates);
}

async function resolveWorkspaceContext(): Promise<WorkspaceContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const [{ data: preferences, error: preferencesError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      supabase
        .from("user_preferences")
        .select("active_workspace_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(id, name, base_currency)")
        .eq("user_id", user.id),
    ]);

  if (preferencesError) throw preferencesError;
  if (membershipsError) throw membershipsError;

  const membershipRows =
    (memberships as Array<{
      workspace_id: string;
      workspaces: {
        id: string;
        name: string;
        base_currency: string | null;
      } | null;
    }> | null) ?? [];

  const activeMembership =
    membershipRows.find(
      (membership) => membership.workspace_id === preferences?.active_workspace_id,
    ) ?? membershipRows[0];

  if (!activeMembership?.workspaces) {
    throw new Error("No active workspace found");
  }

  const walletsResult = await listWallets(supabase, activeMembership.workspace_id);
  if (walletsResult.error) throw walletsResult.error;

  return {
    workspace: activeMembership.workspaces,
    wallets: walletsResult.data ?? [],
  };
}

async function getBillInsights(
  client: Awaited<ReturnType<typeof createClient>>,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
): Promise<BillInsightsResult> {
  if (!params.walletId) {
    return {
      latestBillBurdenPercent: null,
      latestNetAfterBillsCents: null,
    };
  }

  try {
    const [billBurdenResult, cashFlowAfterBillsResult] = await Promise.all([
      getBillBurdenRatio(client, params),
      getCashFlowAfterBills(client, params),
    ]);

    if (billBurdenResult.error || cashFlowAfterBillsResult.error) {
      console.warn("Finance copilot bill insights unavailable", {
        billBurdenError: billBurdenResult.error,
        cashFlowAfterBillsError: cashFlowAfterBillsResult.error,
      });

      return {
        latestBillBurdenPercent: null,
        latestNetAfterBillsCents: null,
      };
    }

    return {
      latestBillBurdenPercent:
        (billBurdenResult.data ?? []).at(-1)?.burden_ratio ?? null,
      latestNetAfterBillsCents:
        (cashFlowAfterBillsResult.data ?? []).at(-1)?.net_after_bills_cents ??
        null,
    };
  } catch (error) {
    console.warn("Finance copilot bill insights failed", error);
    return {
      latestBillBurdenPercent: null,
      latestNetAfterBillsCents: null,
    };
  }
}

function buildMonthlySeries(
  monthlyStats: Array<{
    month: string;
    income_cents: number;
    outcome_cents: number;
    net_cents: number;
    wallet_id: string | null;
  }>,
  walletMap: Map<string, Wallet>,
  baseCurrency: string,
  conversionRates: Record<string, { rate: number }>,
) {
  const byMonth = new Map<
    string,
    { incomeCents: number; expenseCents: number; netCents: number }
  >();

  monthlyStats.forEach((stat) => {
    if (!stat.wallet_id) return;
    const wallet = walletMap.get(stat.wallet_id);
    if (!wallet) return;

    const incomeCents = convertCurrency(
      stat.income_cents,
      wallet.currency,
      baseCurrency,
      conversionRates,
    );
    const expenseCents = convertCurrency(
      Math.abs(stat.outcome_cents),
      wallet.currency,
      baseCurrency,
      conversionRates,
    );
    const netCents = convertCurrency(
      stat.net_cents,
      wallet.currency,
      baseCurrency,
      conversionRates,
    );

    const current = byMonth.get(stat.month) ?? {
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
    };

    current.incomeCents += incomeCents;
    current.expenseCents += expenseCents;
    current.netCents += netCents;
    byMonth.set(stat.month, current);
  });

  return Array.from(byMonth.entries())
    .map(([month, values]) => ({
      month,
      ...values,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function buildForecastSummary(
  monthlyBalances: Array<{
    month: string;
    balance_cents: number;
    wallet_id: string;
  }>,
  monthlyStats: Array<{
    month: string;
    income_cents: number;
    outcome_cents: number;
    net_cents: number;
    wallet_id: string | null;
  }>,
  visibleWallets: Wallet[],
  walletMap: Map<string, Wallet>,
  baseCurrency: string,
  conversionRates: Record<string, { rate: number }>,
) {
  const historicalTotals = calculateMonthlyTotals(
    monthlyBalances,
    conversionRates,
    baseCurrency,
    walletMap,
  );

  if (historicalTotals.length === 0) {
    return {
      trainingMonths: 0,
      confidence: "low" as const,
      recoveryDetected: false,
      currentBalanceCents: 0,
      months: [],
    };
  }

  const balanceSeries = historicalTotals.map((point) =>
    visibleWallets.reduce((sum, wallet) => {
      const walletValue = point[wallet.id];
      return sum + (typeof walletValue === "number" ? walletValue : 0);
    }, 0),
  );

  const visibleWalletIds = new Set(visibleWallets.map((wallet) => wallet.id));
  const byMonth = new Map<string, number>();

  monthlyStats.forEach((stat) => {
    if (!stat.wallet_id || !visibleWalletIds.has(stat.wallet_id)) return;
    const value = toBaseCents(
      stat.net_cents,
      stat.wallet_id,
      walletMap,
      baseCurrency,
      conversionRates,
    );
    byMonth.set(stat.month, (byMonth.get(stat.month) ?? 0) + value / 100);
  });

  const rawNetSeries = Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value)
    .slice(-36);

  const alignedBalanceSeries = balanceSeries.slice(-rawNetSeries.length);
  const recoveryIdx = findRecoveryStartIndex(rawNetSeries, alignedBalanceSeries);
  const cleanedSeries = winsorize(
    recoveryIdx > 0 ? rawNetSeries.slice(recoveryIdx) : rawNetSeries,
  );
  const projectedNetChanges = forecastHoltWinters(cleanedSeries, 6);
  const currentBalanceCents = Math.round(balanceSeries[balanceSeries.length - 1] * 100);
  const lastMonth = historicalTotals[historicalTotals.length - 1]?.month;

  let runningBalance = currentBalanceCents / 100;
  const months = lastMonth
    ? projectedNetChanges.map((projected, index) => {
        const nextMonth = addMonths(new Date(lastMonth), index + 1);
        runningBalance += projected;
        return {
          month: format(nextMonth, "yyyy-MM-dd"),
          projectedBalanceCents: Math.round(runningBalance * 100),
          projectedNetChangeCents: Math.round(projected * 100),
        };
      })
    : [];

  const trainingMonths = cleanedSeries.length;
  const confidence =
    trainingMonths >= 24 ? "high" : trainingMonths >= 12 ? "medium" : "low";

  return {
    trainingMonths,
    confidence,
    recoveryDetected: recoveryIdx > 0,
    currentBalanceCents,
    months,
  };
}

function buildNotableSignals(briefing: FinancialBriefing) {
  const signals: string[] = [];

  if (briefing.historical.trailing.last3MonthsNetCents < 0) {
    signals.push(
      `The last 3 months are net negative at ${formatMoney(briefing.historical.trailing.last3MonthsNetCents, briefing.scope.baseCurrency)}.`,
    );
  }

  if (briefing.composition.topExpenseCategories[0]?.percentage >= 35) {
    const topCategory = briefing.composition.topExpenseCategories[0];
    signals.push(
      `${topCategory.name} accounts for ${topCategory.percentage.toFixed(0)}% of tracked expenses.`,
    );
  }

  if ((briefing.composition.latestBillBurdenPercent ?? 0) >= 40) {
    signals.push(
      `Bill burden is elevated at ${briefing.composition.latestBillBurdenPercent?.toFixed(0)}% of income.`,
    );
  }

  const finalForecast = briefing.forecast.months.at(-1);
  if (
    finalForecast &&
    finalForecast.projectedBalanceCents < briefing.forecast.currentBalanceCents
  ) {
    signals.push("The 6-month forecast trends below the current balance.");
  }

  return signals;
}

export async function buildFinancialBriefing(
  filters: Filters & {
    walletId?: string;
    timezone?: string;
  },
) {
  const context = await resolveWorkspaceContext();
  const supabase = await createClient();
  const baseCurrency = context.workspace.base_currency || "USD";
  const visibleWallets = filters.walletId
    ? context.wallets.filter((wallet) => wallet.id === filters.walletId)
    : context.wallets;

  if (filters.walletId && visibleWallets.length === 0) {
    throw new Error("Wallet not found in active workspace");
  }

  const walletMap = new Map(context.wallets.map((wallet) => [wallet.id, wallet]));
  const visibleWalletIds = visibleWallets.map((wallet) => wallet.id);

  let conversionRates: Record<string, { rate: number }> = {
    [baseCurrency]: { rate: 1 },
  };

  try {
    const fetchedRates = await fetchAllConversions({
      currencies: Array.from(
        new Set(context.wallets.map((wallet) => wallet.currency)),
      ),
      baseCurrency,
    });
    conversionRates = Object.fromEntries(
      Object.entries({
        ...fetchedRates,
        [baseCurrency]: {
          rate: 1,
          lastUpdated: new Date().toISOString(),
          source: "direct",
        },
      }).map(([currency, value]) => [currency, { rate: value.rate }]),
    );
  } catch {
    context.wallets.forEach((wallet) => {
      conversionRates[wallet.currency] = conversionRates[wallet.currency] ?? {
        rate: 1,
      };
    });
  }

  const scopedFilters: Filters = {
    from: filters.from,
    to: filters.to,
    wallet_id: filters.walletId,
  };
  const analyticsParams = {
    walletId: filters.walletId,
    from: filters.from,
    to: filters.to,
  };

  const workspaceWalletScope =
    filters.walletId || visibleWalletIds.length === 0 ? undefined : visibleWalletIds;

  const [
    monthlyBalancesResult,
    filteredMonthlyStatsResult,
    fullMonthlyStatsResult,
    cashflowBreakdownResult,
    expenseConcentrationResult,
    currencyExposureResult,
    expenseSizeDistributionResult,
    walletMonthlyOwedResult,
    recentTransactionsResult,
    billInsights,
  ] = await Promise.all([
    getWalletMonthlyBalances(supabase, { walletId: filters.walletId }),
    getMonthlyStats(supabase, analyticsParams),
    getMonthlyStats(supabase, { walletId: filters.walletId }),
    getCashflowBreakdown(supabase, scopedFilters),
    getExpenseConcentration(supabase, {
      walletId: filters.walletId,
      workspaceWalletIds: workspaceWalletScope,
      from: filters.from,
      to: filters.to,
      topN: 5,
    }),
    getCurrencyExposure(supabase, analyticsParams),
    getTransactionSizeDistribution(supabase, {
      walletId: filters.walletId,
      from: filters.from,
      to: filters.to,
      type: "expense",
    }),
    getWalletMonthlyOwed(supabase, { walletId: filters.walletId }),
    listTransactions(supabase, {
      ...scopedFilters,
      workspaceWalletIds: workspaceWalletScope,
      pageSize: 8,
      page: 0,
    }),
    getBillInsights(supabase, analyticsParams),
  ]);

  if (monthlyBalancesResult.error) throw monthlyBalancesResult.error;
  if (filteredMonthlyStatsResult.error) throw filteredMonthlyStatsResult.error;
  if (fullMonthlyStatsResult.error) throw fullMonthlyStatsResult.error;
  if (cashflowBreakdownResult.error) throw cashflowBreakdownResult.error;
  if (expenseConcentrationResult.error) throw expenseConcentrationResult.error;
  if (currencyExposureResult.error) throw currencyExposureResult.error;
  if (expenseSizeDistributionResult.error) throw expenseSizeDistributionResult.error;
  if (walletMonthlyOwedResult.error) throw walletMonthlyOwedResult.error;
  if (recentTransactionsResult.error) throw recentTransactionsResult.error;

  const monthlyBalances = monthlyBalancesResult.data ?? [];
  const filteredMonthlyStats = filteredMonthlyStatsResult.data ?? [];
  const fullMonthlyStats = fullMonthlyStatsResult.data ?? [];
  const walletMonthlyOwed = walletMonthlyOwedResult.data ?? [];
  const monthlySeries = buildMonthlySeries(
    filteredMonthlyStats,
    walletMap,
    baseCurrency,
    conversionRates,
  );

  const latestBalanceByWallet = new Map<string, number>();
  monthlyBalances.forEach((balance) => {
    latestBalanceByWallet.set(balance.wallet_id, balance.balance_cents);
  });

  const latestOwedByWallet = new Map<string, number>();
  walletMonthlyOwed.forEach((owed) => {
    latestOwedByWallet.set(owed.wallet_id, owed.owed_cents);
  });

  const balanceByWallet = visibleWallets.map((wallet) => {
    const balanceCents = latestBalanceByWallet.get(wallet.id) ?? 0;
    const owedCents = latestOwedByWallet.get(wallet.id) ?? 0;
    return {
      walletId: wallet.id,
      walletName: wallet.name,
      currency: wallet.currency,
      balanceCents,
      balanceInBaseCents: convertCurrency(
        balanceCents,
        wallet.currency,
        baseCurrency,
        conversionRates,
      ),
      owedInBaseCents: convertCurrency(
        owedCents,
        wallet.currency,
        baseCurrency,
        conversionRates,
      ),
    };
  });

  const recentTransactions = (
    (recentTransactionsResult.data ?? []) as Array<Record<string, unknown>>
  ).map((transaction) => {
    const walletId = String(transaction.wallet_id ?? "");
    const wallet = walletMap.get(walletId);
    const amountCents = Number(transaction.amount_cents ?? 0);
    const amountInBaseCents =
      typeof transaction.base_amount_cents === "number"
        ? Number(transaction.base_amount_cents)
        : wallet
          ? convertCurrency(
              amountCents,
              wallet.currency,
              baseCurrency,
              conversionRates,
            )
          : amountCents;

    return {
      id: String(transaction.id ?? ""),
      date: String(transaction.date ?? ""),
      description:
        typeof transaction.description === "string"
          ? transaction.description
          : null,
      type: typeof transaction.type === "string" ? transaction.type : null,
      walletName: wallet?.name ?? "Unknown wallet",
      amountCents,
      amountInBaseCents,
    };
  });

  const forecast = buildForecastSummary(
    monthlyBalances,
    fullMonthlyStats,
    visibleWallets,
    walletMap,
    baseCurrency,
    conversionRates,
  );

  const trailingNetSeries = monthlySeries.map((item) => item.netCents);

  const briefing: FinancialBriefing = {
    generatedAt: new Date().toISOString(),
    scope: {
      workspaceId: context.workspace.id,
      workspaceName: context.workspace.name,
      baseCurrency,
      timezone: filters.timezone ?? "UTC",
      walletId: filters.walletId,
      walletNames: visibleWallets.map((wallet) => wallet.name),
      from: filters.from,
      to: filters.to,
    },
    currentPosition: {
      totalBalanceCents: balanceByWallet.reduce(
        (sum, wallet) => sum + wallet.balanceInBaseCents,
        0,
      ),
      totalOwedCents: balanceByWallet.reduce(
        (sum, wallet) => sum + wallet.owedInBaseCents,
        0,
      ),
      totalCashflowCents: cashflowBreakdownResult.data?.total_cashflow ?? 0,
      totalIncomeCents: cashflowBreakdownResult.data?.total_incomes ?? 0,
      totalExpenseCents: Math.abs(
        cashflowBreakdownResult.data?.total_expenses ?? 0,
      ),
      balanceByWallet,
    },
    historical: {
      monthsAvailable: monthlySeries.length,
      monthlyNet: monthlySeries.slice(-12),
      trailing: {
        avgIncomeCents: average(
          monthlySeries.slice(-6).map((item) => item.incomeCents),
        ),
        avgExpenseCents: average(
          monthlySeries.slice(-6).map((item) => item.expenseCents),
        ),
        avgNetCents: average(
          monthlySeries.slice(-6).map((item) => item.netCents),
        ),
        last3MonthsNetCents: sumLast(trailingNetSeries, 3),
        last6MonthsNetCents: sumLast(trailingNetSeries, 6),
        last12MonthsNetCents: sumLast(trailingNetSeries, 12),
        netVolatilityCents: standardDeviation(trailingNetSeries.slice(-12)),
      },
    },
    forecast,
    composition: {
      topExpenseCategories: (expenseConcentrationResult.data ?? []).map((item) => ({
        name: item.category_name,
        totalCents: item.total_cents,
        percentage: item.percentage,
      })),
      currencyExposure: (currencyExposureResult.data ?? []).map((item) => ({
        currency: item.currency,
        transactionCount: item.transaction_count,
        totalAmountCents: item.total_amount_cents,
      })),
      expenseSizeDistribution: (expenseSizeDistributionResult.data ?? []).map(
        (item) => ({
          range: item.range,
          count: item.count,
          totalAmountCents: item.total_amount_cents,
        }),
      ),
      latestBillBurdenPercent: billInsights.latestBillBurdenPercent,
      latestNetAfterBillsCents: billInsights.latestNetAfterBillsCents,
    },
    recentTransactions,
    notableSignals: [],
  };

  briefing.notableSignals = buildNotableSignals(briefing);

  return {
    briefing,
    context,
  };
}

function resolveToolScope(
  toolContext: FinancialToolContext,
  scopeOverride: Partial<FinancialBriefingScope>,
) {
  return {
    walletId: scopeOverride.walletId ?? toolContext.scope.walletId,
    from: scopeOverride.from ?? toolContext.scope.from,
    to: scopeOverride.to ?? toolContext.scope.to,
    timezone: toolContext.scope.timezone,
  };
}

function getWorkspaceWalletScope(
  wallets: Wallet[],
  walletId?: string,
) {
  if (walletId) return undefined;
  return wallets.map((wallet) => wallet.id);
}

function summarizeTransactions(
  transactions: Array<Record<string, unknown>>,
  walletMap: Map<string, Wallet>,
) {
  return transactions.map((transaction) => ({
    id: String(transaction.id ?? ""),
    date: String(transaction.date ?? ""),
    description:
      typeof transaction.description === "string"
        ? transaction.description
        : null,
    type: typeof transaction.type === "string" ? transaction.type : null,
    walletId: String(transaction.wallet_id ?? ""),
    walletName:
      walletMap.get(String(transaction.wallet_id ?? ""))?.name ?? "Unknown wallet",
    amountCents: Number(transaction.amount_cents ?? 0),
    baseAmountCents: Number(
      typeof transaction.base_amount_cents === "number"
        ? transaction.base_amount_cents
        : transaction.amount_cents ?? 0,
    ),
    categoryId:
      typeof transaction.category_id === "string" ? transaction.category_id : null,
    labelId: typeof transaction.label_id === "string" ? transaction.label_id : null,
  }));
}

async function runGetTransactionsTool(
  toolContext: FinancialToolContext,
  rawArgs: unknown,
) {
  const args = GetTransactionsArgsSchema.parse(rawArgs);
  const scope = resolveToolScope(toolContext, args);
  const supabase = await createClient();
  const walletMap = new Map(
    toolContext.context.wallets.map((wallet) => [wallet.id, wallet]),
  );

  const result = await listTransactions(supabase, {
    wallet_id: scope.walletId,
    from: scope.from,
    to: scope.to,
    category_id: args.categoryId,
    label_id: args.labelId,
    tag: args.tag,
    type: args.type,
    description: args.description,
    workspaceWalletIds: getWorkspaceWalletScope(
      toolContext.context.wallets,
      scope.walletId,
    ),
    page: 0,
    pageSize: args.limit,
  });

  if (result.error) throw result.error;

  const transactions = summarizeTransactions(
    (result.data ?? []) as Array<Record<string, unknown>>,
    walletMap,
  );

  return {
    scope: {
      walletId: scope.walletId ?? null,
      from: scope.from ?? null,
      to: scope.to ?? null,
    },
    count: transactions.length,
    transactions,
  };
}

async function runCategoryDrilldownTool(
  toolContext: FinancialToolContext,
  rawArgs: unknown,
) {
  const args = CategoryDrilldownArgsSchema.parse(rawArgs);
  const transactions = await runGetTransactionsTool(toolContext, {
    walletId: args.walletId,
    from: args.from,
    to: args.to,
    categoryId: args.categoryId,
    limit: args.limit,
  });

  const totalBaseAmountCents = transactions.transactions.reduce(
    (sum, transaction) => sum + Math.abs(transaction.baseAmountCents),
    0,
  );

  return {
    categoryId: args.categoryId,
    count: transactions.count,
    totalBaseAmountCents,
    transactions: transactions.transactions,
  };
}

async function runForecastDetailsTool(
  toolContext: FinancialToolContext,
  rawArgs: unknown,
) {
  const args = ForecastDetailsArgsSchema.parse(rawArgs);
  const scope = resolveToolScope(toolContext, args);
  const { briefing } = await buildFinancialBriefing(scope);

  return {
    scope: {
      walletId: scope.walletId ?? null,
      from: scope.from ?? null,
      to: scope.to ?? null,
    },
    trainingMonths: briefing.forecast.trainingMonths,
    confidence: briefing.forecast.confidence,
    recoveryDetected: briefing.forecast.recoveryDetected,
    currentBalanceCents: briefing.forecast.currentBalanceCents,
    months: briefing.forecast.months.slice(0, args.horizonMonths),
  };
}

async function runBillOverviewTool(
  toolContext: FinancialToolContext,
  rawArgs: unknown,
) {
  const args = BillOverviewArgsSchema.parse(rawArgs);
  const scope = resolveToolScope(toolContext, args);
  if (!scope.walletId) {
    return {
      scope: {
        walletId: null,
        from: scope.from ?? null,
        to: scope.to ?? null,
      },
      unavailableReason:
        "Bill overview currently requires a wallet scope to avoid very large workspace-wide payment queries.",
    };
  }

  const supabase = await createClient();
  const [billBurdenResult, cashFlowAfterBillsResult] = await Promise.all([
    getBillBurdenRatio(supabase, {
      walletId: scope.walletId,
      from: scope.from,
      to: scope.to,
    }),
    getCashFlowAfterBills(supabase, {
      walletId: scope.walletId,
      from: scope.from,
      to: scope.to,
    }),
  ]);

  if (billBurdenResult.error) throw billBurdenResult.error;
  if (cashFlowAfterBillsResult.error) throw cashFlowAfterBillsResult.error;

  return {
    scope: {
      walletId: scope.walletId ?? null,
      from: scope.from ?? null,
      to: scope.to ?? null,
    },
    latestBillBurdenPercent:
      (billBurdenResult.data ?? []).at(-1)?.burden_ratio ?? null,
    latestNetAfterBillsCents:
      (cashFlowAfterBillsResult.data ?? []).at(-1)?.net_after_bills_cents ?? null,
    months: (cashFlowAfterBillsResult.data ?? []).slice(-6),
  };
}

export async function executeFinanceTool(
  toolContext: FinancialToolContext,
  toolName: string,
  rawArgs: unknown,
) {
  if (toolName === "get_financial_briefing") {
    const scope = resolveToolScope(
      toolContext,
      ToolScopeSchema.parse(rawArgs ?? {}),
    );
    const { briefing } = await buildFinancialBriefing(scope);
    return briefing;
  }

  if (toolName === "get_transactions") {
    return runGetTransactionsTool(toolContext, rawArgs);
  }

  if (toolName === "get_category_drilldown") {
    return runCategoryDrilldownTool(toolContext, rawArgs);
  }

  if (toolName === "get_forecast_details") {
    return runForecastDetailsTool(toolContext, rawArgs);
  }

  if (toolName === "get_bill_overview") {
    return runBillOverviewTool(toolContext, rawArgs);
  }

  throw new Error(`Unknown finance tool: ${toolName}`);
}

export function buildFinanceSystemPrompt(briefing: FinancialBriefing) {
  return [
    "You are a finance copilot inside a personal/workspace finance product.",
    "Be evidence-first, concise, and advisory-only.",
    "Do not claim to execute changes or financial trades.",
    "Base recommendations on the supplied briefing and any read-only tools you choose to call.",
    "If the data is insufficient or uncertain, say so plainly.",
    "Always quantify claims when possible and cite the most relevant evidence.",
    "Use tools when the user asks for transaction-level causes, forecast detail, bill detail, or category drilldowns.",
    `Base currency: ${briefing.scope.baseCurrency}.`,
    `Timezone: ${briefing.scope.timezone}.`,
    "Return JSON matching the requested schema.",
  ].join(" ");
}
