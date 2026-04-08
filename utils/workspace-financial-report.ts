import { format } from "date-fns";

import { buildMonthlySeries } from "@/utils/ai/finance-copilot-builders";
import { convertCurrency } from "@/utils/currency-conversion";
import { fetchAllConversions } from "@/utils/fetch-conversions-server";
import { formatCents } from "@/utils/format-cents";
import {
  getExpenseConcentration,
  getMonthlyBillStats,
  getMonthlyStats,
  listBillsWithPayments,
  listTransactions,
  listWallets,
} from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";
import type { TransactionList, Wallet } from "@/utils/supabase/types";
import {
  createEmptyFinanceMemory,
  parseFinanceMemory,
} from "@/utils/types/finance-memory";

import type {
  WorkspaceFinancialReport,
  WorkspaceFinancialReportFilters,
} from "./workspace-financial-report-types";

function walletTypeLabel(walletType: Wallet["wallet_type"]) {
  switch (walletType) {
    case "card":
      return "Card";
    case "cash":
      return "Cash";
    case "bank_account":
    default:
      return "Bank account";
  }
}

function transactionDescription(
  transaction: Pick<TransactionList, "description" | "note">,
) {
  return transaction.description || transaction.note || "Untitled transaction";
}

async function resolveWorkspaceReportContext(workspaceId?: string) {
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
        .select("workspace_id, workspaces(id, name, base_currency, finance_memory)")
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
        finance_memory?: unknown;
      } | null;
    }> | null) ?? [];

  const targetWorkspaceId = workspaceId ?? preferences?.active_workspace_id;
  const membership =
    membershipRows.find((row) => row.workspace_id === targetWorkspaceId) ??
    membershipRows[0];

  if (!membership?.workspaces) {
    throw new Error("No active workspace found");
  }

  const walletsResult = await listWallets(supabase, membership.workspace_id);
  if (walletsResult.error) {
    throw walletsResult.error;
  }

  return {
    supabase,
    workspace: {
      id: membership.workspaces.id,
      name: membership.workspaces.name,
      base_currency: membership.workspaces.base_currency ?? "USD",
      finance_memory: membership.workspaces.finance_memory
        ? parseFinanceMemory(membership.workspaces.finance_memory)
        : createEmptyFinanceMemory(),
    },
    wallets: (walletsResult.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
  };
}

async function listAllWorkspaceTransactions(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspaceWalletIds: string[];
  from?: string;
  to?: string;
}) {
  const pageSize = 1000;
  let page = 0;
  let transactions: TransactionList[] = [];

  while (true) {
    const result = await listTransactions(params.supabase, {
      workspaceWalletIds: params.workspaceWalletIds,
      from: params.from,
      to: params.to,
      page,
      pageSize,
      sort: "date",
      sortOrder: "desc",
    });

    if (result.error) {
      throw result.error;
    }

    const nextPage = (result.data ?? []) as TransactionList[];
    transactions = transactions.concat(nextPage);

    if (nextPage.length < pageSize) {
      break;
    }

    page += 1;
  }

  return transactions;
}

function buildCurrencyExposure(transactions: WorkspaceFinancialReport["transactions"]) {
  const byCurrency = new Map<
    string,
    {
      transactionCount: number;
      totalAmountCents: number;
    }
  >();

  transactions.forEach((transaction) => {
    const current = byCurrency.get(transaction.currency) ?? {
      transactionCount: 0,
      totalAmountCents: 0,
    };
    current.transactionCount += 1;
    current.totalAmountCents += Math.abs(transaction.amountCents);
    byCurrency.set(transaction.currency, current);
  });

  return Array.from(byCurrency.entries())
    .map(([currency, value]) => ({
      currency,
      transactionCount: value.transactionCount,
      totalAmountCents: value.totalAmountCents,
    }))
    .sort((a, b) => b.totalAmountCents - a.totalAmountCents);
}

function buildNotableSignals(
  report: Pick<
    WorkspaceFinancialReport,
    "summary" | "expenseCategories" | "monthlyCashflow" | "workspace"
  >,
) {
  const signals: string[] = [];
  const { baseCurrency } = report.workspace;

  if (report.summary.totalNetCashflowCents < 0) {
    signals.push(
      `Tracked net cash flow is negative at ${formatCents(report.summary.totalNetCashflowCents, baseCurrency)} in the selected period.`,
    );
  }

  const topCategory = report.expenseCategories[0];
  if (topCategory && topCategory.percentage >= 35) {
    signals.push(
      `${topCategory.categoryName} accounts for ${topCategory.percentage.toFixed(0)}% of tracked expenses.`,
    );
  }

  if ((report.summary.latestBillBurdenPercent ?? 0) >= 40) {
    signals.push(
      `Bill burden is elevated at ${report.summary.latestBillBurdenPercent?.toFixed(0)}% of income in the latest month with bills.`,
    );
  }

  const latestMonth = report.monthlyCashflow.at(-1);
  if (latestMonth && latestMonth.netCents < 0) {
    signals.push(
      `The latest month in the cash flow series closed negative at ${formatCents(latestMonth.netCents, baseCurrency)}.`,
    );
  }

  return signals;
}

export async function buildWorkspaceFinancialReport(
  filters: WorkspaceFinancialReportFilters = {},
): Promise<WorkspaceFinancialReport> {
  const context = await resolveWorkspaceReportContext(filters.workspaceId);
  const { supabase, workspace, wallets } = context;
  const workspaceWalletIds = wallets.map((wallet) => wallet.id);
  const walletMap = new Map(wallets.map((wallet) => [wallet.id, wallet]));
  const baseCurrency = workspace.base_currency;

  let conversionRates: Record<string, { rate: number }> = {
    [baseCurrency]: { rate: 1 },
  };

  try {
    const fetchedRates = await fetchAllConversions({
      currencies: Array.from(new Set(wallets.map((wallet) => wallet.currency))),
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
    wallets.forEach((wallet) => {
      conversionRates[wallet.currency] = conversionRates[wallet.currency] ?? {
        rate: 1,
      };
    });
  }

  const [transactionsRaw, billsResult, monthlyStatsResult, monthlyBillStatsResult, expenseConcentrationResult] =
    await Promise.all([
      listAllWorkspaceTransactions({
        supabase,
        workspaceWalletIds,
        from: filters.from,
        to: filters.to,
      }),
      listBillsWithPayments(supabase, {
        walletIds: workspaceWalletIds,
        from: filters.from,
        to: filters.to,
      }),
      getMonthlyStats(supabase, {
        workspaceWalletIds,
        from: filters.from,
        to: filters.to,
      }),
      getMonthlyBillStats(supabase, {
        walletIds: workspaceWalletIds,
        from: filters.from,
        to: filters.to,
      }),
      getExpenseConcentration(supabase, {
        workspaceWalletIds,
        from: filters.from,
        to: filters.to,
        topN: 5,
      }),
    ]);

  if (billsResult.error) throw billsResult.error;
  if (monthlyStatsResult.error) throw monthlyStatsResult.error;
  if (monthlyBillStatsResult.error) throw monthlyBillStatsResult.error;
  if (expenseConcentrationResult.error) throw expenseConcentrationResult.error;

  const transactions = transactionsRaw.map((transaction) => {
    const wallet = transaction.wallet_id
      ? walletMap.get(transaction.wallet_id)
      : undefined;
    const transactionCurrency = transaction.currency || wallet?.currency || baseCurrency;
    const amountCents = transaction.amount_cents ?? 0;
    const amountInBaseCents =
      typeof transaction.base_amount_cents === "number"
        ? transaction.base_amount_cents
        : convertCurrency(
            amountCents,
            transactionCurrency,
            baseCurrency,
            conversionRates,
          );

    return {
      id: transaction.id ?? "",
      date: transaction.date ?? "",
      type: transaction.type ?? "unknown",
      description: transactionDescription(transaction),
      walletId: transaction.wallet_id ?? "",
      walletName: wallet?.name ?? "Unknown wallet",
      currency: transactionCurrency,
      amountCents,
      amountInBaseCents,
      categoryId: transaction.category_id ?? null,
      labelId: transaction.label_id ?? null,
      tags: transaction.tags ?? [],
      note: transaction.note ?? null,
      transferId: transaction.transfer_id ?? null,
    };
  });

  const bills = (billsResult.data ?? [])
    .map((bill) => {
      const remainingCents = Math.max(0, bill.amount_cents - bill.paid_amount_cents);
      const wallet = walletMap.get(bill.wallet_id);

      return {
        id: bill.id,
        walletId: bill.wallet_id,
        walletName: wallet?.name ?? "Unknown wallet",
        dueDate: bill.due_date,
        description: bill.description,
        currency: bill.currency,
        amountCents: bill.amount_cents,
        paidAmountCents: bill.paid_amount_cents,
        remainingCents,
        status: remainingCents === 0 ? "paid" : bill.paid_amount_cents > 0 ? "partial" : "unpaid",
      } as const;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const owedByWallet = new Map<string, number>();
  bills.forEach((bill) => {
    owedByWallet.set(
      bill.walletId,
      (owedByWallet.get(bill.walletId) ?? 0) + bill.remainingCents,
    );
  });

  const walletRows = wallets.map((wallet) => {
    const currentBalanceCents = wallet.balance_cents ?? 0;
    const owedCents = owedByWallet.get(wallet.id) ?? 0;

    return {
      walletId: wallet.id,
      walletName: wallet.name,
      walletType: walletTypeLabel(wallet.wallet_type),
      currency: wallet.currency,
      currentBalanceCents,
      currentBalanceInBaseCents: convertCurrency(
        currentBalanceCents,
        wallet.currency,
        baseCurrency,
        conversionRates,
      ),
      owedCents,
      owedInBaseCents: convertCurrency(
        owedCents,
        wallet.currency,
        baseCurrency,
        conversionRates,
      ),
    };
  });

  const monthlySeriesBase = buildMonthlySeries(
    monthlyStatsResult.data ?? [],
    walletMap,
    baseCurrency,
    conversionRates,
  );
  const monthlyBillStats = monthlyBillStatsResult.data ?? [];
  const monthlyBillsByMonth = monthlyBillStats.reduce(
    (acc, row) => {
      acc[row.month] = (acc[row.month] ?? 0) + row.total_bills_cents;
      return acc;
    },
    {} as Record<string, number>,
  );

  const monthlyCashflow = monthlySeriesBase.map((row) => {
    const billsForMonth = monthlyBillsByMonth[row.month] ?? 0;
    const billBurdenPercent =
      row.incomeCents > 0 ? (billsForMonth / row.incomeCents) * 100 : null;

    return {
      month: row.month,
      incomeCents: row.incomeCents,
      expenseCents: row.expenseCents,
      netCents: row.netCents,
      billBurdenPercent,
    };
  });

  const expenseCategories = (expenseConcentrationResult.data ?? []).map((item) => ({
    categoryName: item.category_name,
    totalCents: item.total_cents,
    percentage: item.percentage,
  }));

  const totalIncomeCents = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amountInBaseCents), 0);
  const totalExpenseCents = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amountInBaseCents), 0);
  const totalNetCashflowCents = totalIncomeCents - totalExpenseCents;
  const totalBalanceCents = walletRows.reduce(
    (sum, wallet) => sum + wallet.currentBalanceInBaseCents,
    0,
  );
  const totalOwedCents = walletRows.reduce((sum, wallet) => sum + wallet.owedInBaseCents, 0);
  const totalBillsOwedCents = bills.reduce(
    (sum, bill) =>
      sum +
      convertCurrency(bill.amountCents, bill.currency, baseCurrency, conversionRates),
    0,
  );
  const totalBillsPaidCents = bills.reduce(
    (sum, bill) =>
      sum +
      convertCurrency(bill.paidAmountCents, bill.currency, baseCurrency, conversionRates),
    0,
  );
  const totalBillsRemainingCents = bills.reduce(
    (sum, bill) =>
      sum +
      convertCurrency(bill.remainingCents, bill.currency, baseCurrency, conversionRates),
    0,
  );
  const latestBillBurdenPercent =
    monthlyCashflow
      .filter((row) => row.billBurdenPercent !== null)
      .at(-1)?.billBurdenPercent ?? null;

  const report: WorkspaceFinancialReport = {
    generatedAt: new Date().toISOString(),
    period: {
      from: filters.from ?? null,
      to: filters.to ?? null,
      label:
        filters.from || filters.to
          ? `${filters.from ?? "Start"} to ${filters.to ?? "Present"}`
          : "All time",
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
      baseCurrency,
      includedWalletCount: walletRows.length,
    },
    coverage: {
      includes: [
        "Wallet balances",
        "Cash and card transaction history",
        "Bills and payment status",
        "Monthly cash flow",
        "Workspace finance profile context",
      ],
      limitations: [
        "This export does not model off-platform investment holdings or external liabilities that are not tracked in the workspace.",
        "Wallet balances are current account snapshots; historical holdings outside this product are not included.",
        "Advisor context fields come from workspace finance preferences and may be incomplete if not maintained.",
      ],
    },
    advisorContext: {
      countryOfResidence: workspace.finance_memory.profile.country_of_residence,
      taxRegion: workspace.finance_memory.profile.tax_region,
      preferredLanguage: workspace.finance_memory.profile.preferred_language,
      riskTolerance: workspace.finance_memory.profile.risk_tolerance,
      liquidityNeeds: workspace.finance_memory.profile.liquidity_needs,
      timeHorizon: workspace.finance_memory.profile.time_horizon,
      investmentGoals: workspace.finance_memory.profile.investment_goals,
      constraints: workspace.finance_memory.profile.constraints,
      knownLimitations: workspace.finance_memory.profile.known_limitations,
      marketsAccessible: workspace.finance_memory.profile.markets_accessible,
      instrumentsAccessible: workspace.finance_memory.profile.instruments_accessible,
      brokeragePlatforms: workspace.finance_memory.profile.brokerage_platforms,
      accountTypes: workspace.finance_memory.profile.account_types,
      sourceProfile: workspace.finance_memory.profile,
    },
    summary: {
      totalBalanceCents,
      totalOwedCents,
      netTrackedPositionCents: totalBalanceCents - totalOwedCents,
      totalIncomeCents,
      totalExpenseCents,
      totalNetCashflowCents,
      openBillsCount: bills.filter((bill) => bill.remainingCents > 0).length,
      totalBillsOwedCents,
      totalBillsPaidCents,
      totalBillsRemainingCents,
      latestBillBurdenPercent,
    },
    wallets: walletRows,
    currencyExposure: buildCurrencyExposure(transactions),
    monthlyCashflow,
    expenseCategories,
    notableSignals: [],
    bills,
    transactions,
    recentTransactions: transactions.slice(0, 10).map((transaction) => ({
      id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      description: transaction.description,
      walletName: transaction.walletName,
      currency: transaction.currency,
      amountCents: transaction.amountCents,
      amountInBaseCents: transaction.amountInBaseCents,
    })),
  };

  report.notableSignals = buildNotableSignals(report);

  return report;
}

export function getWorkspaceFinancialReportTitle(report: WorkspaceFinancialReport) {
  return `${report.workspace.name} advisor report (${format(new Date(report.generatedAt), "yyyy-MM-dd")})`;
}
