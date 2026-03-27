import type { Wallet } from "@/utils/supabase/types";
import type {
  FinanceMemory,
  FinanceMemoryDerivedContext,
  FinanceMemoryProfile,
} from "@/utils/types/finance-memory";

export interface FinanceChatEvidence {
  label: string;
  value: string;
  detail: string;
}

export type FinanceChatIntent =
  | "decision"
  | "risk"
  | "diagnosis"
  | "forecast"
  | "comparison"
  | "general";

export interface FinanceChatReply {
  intent: FinanceChatIntent;
  answer: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  decision?: {
    recommendation: string;
    tradeoff: string;
    impactWindow: string;
    whatCouldChange: string;
  } | null;
  analysis?: {
    drivers: string[];
    assumptions: string[];
    forecastSignals: string[];
    missingData: string[];
  } | null;
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
  memory: {
    profile: FinanceMemoryProfile;
    derivedContext: FinanceMemoryDerivedContext;
    localizationContext: {
      countryOfResidence: string | null;
      taxRegion: string | null;
      preferredLanguage: string | null;
      basePlanningCurrency: string;
      heldCurrencies: string[];
      accessibleMarkets: string[];
      accessibleInstruments: string[];
      brokeragePlatforms: string[];
      accountTypes: string[];
      riskTolerance: string | null;
      investmentGoals: string[];
      liquidityNeeds: string | null;
      timeHorizon: string | null;
      constraints: string[];
      knownLimitations: string[];
      freshnessNote: string;
      missingProfileFields: string[];
    };
  };
}

export interface WorkspaceContext {
  workspace: {
    id: string;
    name: string;
    base_currency: string | null;
    finance_memory: FinanceMemory | null;
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

export type BillInsightsResult = {
  latestBillBurdenPercent: number | null;
  latestNetAfterBillsCents: number | null;
};
