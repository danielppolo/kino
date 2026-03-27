import { addMonths, format } from "date-fns";

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
  getCashflowBreakdown,
  getCurrencyExposure,
  getExpenseConcentration,
  getMonthlyStats,
  getTransactionSizeDistribution,
  getWalletMonthlyBalances,
  getWalletMonthlyOwed,
  listTransactions,
} from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";
import type { Wallet } from "@/utils/supabase/types";
import { createEmptyFinanceMemory } from "@/utils/types/finance-memory";
import type {
  FinanceMemory,
  FinanceMemoryDerivedContext,
} from "@/utils/types/finance-memory";

import { getBillInsights, resolveWorkspaceContext, syncWorkspaceFinanceMemory } from "./finance-copilot-data";
import type { FinancialBriefing } from "./finance-copilot-types";
import {
  average,
  formatMoney,
  standardDeviation,
  sumLast,
  toBaseCents,
  walletTypeLabel,
} from "./finance-copilot-utils";

export function buildMonthlySeries(
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

export function buildForecastSummary(
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
    confidence: confidence as "low" | "medium" | "high",
    recoveryDetected: recoveryIdx > 0,
    currentBalanceCents,
    months,
  };
}

export function buildNotableSignals(briefing: Omit<FinancialBriefing, "memory">) {
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

export function deriveFinanceMemoryContext(params: {
  briefing: Omit<FinancialBriefing, "memory">;
  visibleWallets: Wallet[];
  storedMemory: FinanceMemory;
}) {
  const { briefing, visibleWallets, storedMemory } = params;
  const walletTypes = Array.from(
    new Set(visibleWallets.map((wallet) => wallet.wallet_type)),
  );

  const walletTypeTotals = new Map<string, number>();
  briefing.currentPosition.balanceByWallet.forEach((wallet) => {
    const walletType =
      visibleWallets.find((item) => item.id === wallet.walletId)?.wallet_type ??
      "bank_account";
    walletTypeTotals.set(
      walletType,
      (walletTypeTotals.get(walletType) ?? 0) + wallet.balanceInBaseCents,
    );
  });

  const totalBalance = briefing.currentPosition.totalBalanceCents || 1;
  const observedAssetExposureSummary = Array.from(walletTypeTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([walletType, balanceCents]) => ({
      label: walletTypeLabel(walletType as Wallet["wallet_type"]),
      detail: `${Math.round((balanceCents / totalBalance) * 100)}% of tracked balance is held in ${walletTypeLabel(walletType as Wallet["wallet_type"]).toLowerCase()}.`,
    }));

  const currenciesHeld = Array.from(
    new Set([
      ...briefing.currentPosition.balanceByWallet.map((wallet) => wallet.currency),
      ...briefing.composition.currencyExposure.map((item) => item.currency),
    ]),
  );

  const incomeStabilitySignals: string[] = [];
  const liquidityPressureSignals: string[] = [];
  const recentBehavioralNotes = [...briefing.notableSignals];

  if (
    briefing.historical.trailing.avgIncomeCents > 0 &&
    briefing.historical.trailing.netVolatilityCents <=
      briefing.historical.trailing.avgIncomeCents * 0.25
  ) {
    incomeStabilitySignals.push(
      "Income has been relatively stable compared with recent monthly volatility.",
    );
  } else if (briefing.historical.trailing.netVolatilityCents > 0) {
    incomeStabilitySignals.push(
      "Recent monthly net cash flow has been volatile, which lowers confidence in long-horizon investing decisions.",
    );
  }

  if (briefing.historical.trailing.last3MonthsNetCents < 0) {
    liquidityPressureSignals.push(
      "The last 3 months are net negative, so liquidity needs may matter more than long-duration investments.",
    );
  }

  if ((briefing.composition.latestBillBurdenPercent ?? 0) >= 40) {
    liquidityPressureSignals.push(
      "Bill burden is elevated relative to income, which can limit investable surplus.",
    );
  }

  if (
    briefing.forecast.months.at(-1)?.projectedBalanceCents !== undefined &&
    (briefing.forecast.months.at(-1)?.projectedBalanceCents ?? 0) <
      briefing.forecast.currentBalanceCents
  ) {
    liquidityPressureSignals.push(
      "The current forecast trends below the present balance, so investment suggestions should account for downside liquidity risk.",
    );
  }

  let cashVsInvestedBias: string | null = null;
  if (
    walletTypes.every((walletType) =>
      ["bank_account", "card", "cash"].includes(walletType),
    )
  ) {
    cashVsInvestedBias =
      "Tracked assets are mostly cash and spending-account oriented; explicit investment custody is not modeled in current wallets.";
  }

  const nextDerived: FinanceMemoryDerivedContext = {
    currencies_held: currenciesHeld,
    wallet_types: walletTypes,
    observed_asset_exposure_summary: observedAssetExposureSummary,
    observed_instrument_patterns:
      storedMemory.derived_context.observed_instrument_patterns,
    observed_country_market_bias:
      storedMemory.derived_context.observed_country_market_bias,
    cash_vs_invested_bias: cashVsInvestedBias,
    income_stability_signals: incomeStabilitySignals,
    liquidity_pressure_signals: liquidityPressureSignals,
    recent_behavioral_notes: recentBehavioralNotes,
    last_derived_at: new Date().toISOString(),
  };

  const mergedMemory: FinanceMemory = {
    ...storedMemory,
    derived_context: nextDerived,
    derived_updated_at: nextDerived.last_derived_at,
    provenance: {
      profile: "user_declared",
      derived_context: "system_derived",
    },
  };

  const profile = mergedMemory.profile;
  const missingProfileFields = [
    profile.country_of_residence ? null : "country_of_residence",
    profile.markets_accessible.length > 0 ? null : "markets_accessible",
    profile.instruments_accessible.length > 0 ? null : "instruments_accessible",
    profile.risk_tolerance ? null : "risk_tolerance",
    profile.time_horizon ? null : "time_horizon",
  ].filter(Boolean) as string[];

  return {
    memory: mergedMemory,
    localizationContext: {
      countryOfResidence: profile.country_of_residence,
      taxRegion: profile.tax_region,
      preferredLanguage: profile.preferred_language,
      basePlanningCurrency:
        profile.base_planning_currency ?? briefing.scope.baseCurrency,
      heldCurrencies: currenciesHeld,
      accessibleMarkets: profile.markets_accessible,
      accessibleInstruments: profile.instruments_accessible,
      brokeragePlatforms: profile.brokerage_platforms,
      accountTypes: profile.account_types,
      riskTolerance: profile.risk_tolerance,
      investmentGoals: profile.investment_goals,
      liquidityNeeds: profile.liquidity_needs,
      timeHorizon: profile.time_horizon,
      constraints: profile.constraints,
      knownLimitations: profile.known_limitations,
      freshnessNote:
        "Market-access and instrument context is profile-based memory and may be stale or incomplete.",
      missingProfileFields,
    },
  };
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

  const briefingBase: Omit<FinancialBriefing, "memory"> = {
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

  briefingBase.notableSignals = buildNotableSignals(briefingBase);

  const storedMemory = context.workspace.finance_memory ?? createEmptyFinanceMemory();
  const memoryContext = deriveFinanceMemoryContext({
    briefing: briefingBase,
    visibleWallets,
    storedMemory,
  });

  const briefing: FinancialBriefing = {
    ...briefingBase,
    memory: {
      profile: memoryContext.memory.profile,
      derivedContext: memoryContext.memory.derived_context,
      localizationContext: memoryContext.localizationContext,
    },
  };

  await syncWorkspaceFinanceMemory(
    supabase,
    context.workspace.id,
    context.workspace.finance_memory,
    memoryContext.memory,
  );

  return {
    briefing,
    context,
  };
}
