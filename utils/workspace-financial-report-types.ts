import type { FinanceMemory } from "@/utils/types/finance-memory";

export interface WorkspaceFinancialReportFilters {
  workspaceId?: string;
  from?: string;
  to?: string;
}

export interface WorkspaceFinancialReport {
  generatedAt: string;
  period: {
    from: string | null;
    to: string | null;
    label: string;
  };
  workspace: {
    id: string;
    name: string;
    baseCurrency: string;
    includedWalletCount: number;
  };
  coverage: {
    includes: string[];
    limitations: string[];
  };
  advisorContext: {
    countryOfResidence: string | null;
    taxRegion: string | null;
    preferredLanguage: string | null;
    riskTolerance: string | null;
    liquidityNeeds: string | null;
    timeHorizon: string | null;
    investmentGoals: string[];
    constraints: string[];
    knownLimitations: string[];
    marketsAccessible: string[];
    instrumentsAccessible: string[];
    brokeragePlatforms: string[];
    accountTypes: string[];
    sourceProfile: FinanceMemory["profile"];
  };
  summary: {
    totalBalanceCents: number;
    totalOwedCents: number;
    netTrackedPositionCents: number;
    totalIncomeCents: number;
    totalExpenseCents: number;
    totalNetCashflowCents: number;
    openBillsCount: number;
    totalBillsOwedCents: number;
    totalBillsPaidCents: number;
    totalBillsRemainingCents: number;
    latestBillBurdenPercent: number | null;
  };
  wallets: Array<{
    walletId: string;
    walletName: string;
    walletType: string;
    currency: string;
    currentBalanceCents: number;
    currentBalanceInBaseCents: number;
    owedCents: number;
    owedInBaseCents: number;
  }>;
  currencyExposure: Array<{
    currency: string;
    transactionCount: number;
    totalAmountCents: number;
  }>;
  monthlyCashflow: Array<{
    month: string;
    incomeCents: number;
    expenseCents: number;
    netCents: number;
    billBurdenPercent: number | null;
  }>;
  expenseCategories: Array<{
    categoryName: string;
    totalCents: number;
    percentage: number;
  }>;
  notableSignals: string[];
  bills: Array<{
    id: string;
    walletId: string;
    walletName: string;
    dueDate: string;
    description: string;
    currency: string;
    amountCents: number;
    paidAmountCents: number;
    remainingCents: number;
    status: "paid" | "partial" | "unpaid";
  }>;
  transactions: Array<{
    id: string;
    date: string;
    type: string;
    description: string;
    walletId: string;
    walletName: string;
    currency: string;
    amountCents: number;
    amountInBaseCents: number;
    categoryId: string | null;
    labelId: string | null;
    tags: string[];
    note: string | null;
    transferId: string | null;
  }>;
  recentTransactions: Array<{
    id: string;
    date: string;
    type: string;
    description: string;
    walletName: string;
    currency: string;
    amountCents: number;
    amountInBaseCents: number;
  }>;
}

export interface WorkspaceFinancialReportExports {
  markdown: {
    filename: string;
    content: string;
  };
  csvFiles: Array<{
    filename: string;
    content: string;
  }>;
}
