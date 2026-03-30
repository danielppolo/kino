import { describe, expect, it } from "vitest";

import {
  buildWorkspaceFinancialReportExports,
  buildWorkspaceFinancialReportMarkdown,
} from "./workspace-financial-report-format";
import type { WorkspaceFinancialReport } from "./workspace-financial-report-types";

function createReport(): WorkspaceFinancialReport {
  return {
    generatedAt: "2026-03-30T18:00:00.000Z",
    period: {
      from: null,
      to: null,
      label: "All time",
    },
    workspace: {
      id: "workspace-1",
      name: "Kino",
      baseCurrency: "USD",
      includedWalletCount: 2,
    },
    coverage: {
      includes: ["Wallet balances", "Bills"],
      limitations: [
        "This export does not model off-platform investment holdings or external liabilities that are not tracked in the workspace.",
      ],
    },
    advisorContext: {
      countryOfResidence: "Mexico",
      taxRegion: "MX",
      preferredLanguage: "en",
      riskTolerance: "moderate",
      liquidityNeeds: "medium",
      timeHorizon: "long_term",
      investmentGoals: ["Retirement", "Emergency fund"],
      constraints: ["Keep cash reserves"],
      knownLimitations: ["No brokerage holdings tracked"],
      marketsAccessible: ["Mexico", "US"],
      instrumentsAccessible: ["ETFs"],
      brokeragePlatforms: ["GBM"],
      accountTypes: ["Taxable"],
      sourceProfile: {
        country_of_residence: "Mexico",
        tax_region: "MX",
        preferred_language: "en",
        markets_accessible: ["Mexico", "US"],
        brokerage_platforms: ["GBM"],
        account_types: ["Taxable"],
        instruments_accessible: ["ETFs"],
        base_planning_currency: "USD",
        risk_tolerance: "moderate",
        investment_goals: ["Retirement", "Emergency fund"],
        liquidity_needs: "medium",
        time_horizon: "long_term",
        constraints: ["Keep cash reserves"],
        known_limitations: ["No brokerage holdings tracked"],
        preferred_explanation_style: null,
        rebalancing_frequency: null,
        dividend_vs_growth_preference: null,
        tax_sensitivity_preference: null,
        fee_style_preference: null,
      },
    },
    summary: {
      totalBalanceCents: 500000,
      totalOwedCents: 125000,
      netTrackedPositionCents: 375000,
      totalIncomeCents: 700000,
      totalExpenseCents: 400000,
      totalNetCashflowCents: 300000,
      openBillsCount: 1,
      totalBillsOwedCents: 125000,
      totalBillsPaidCents: 50000,
      totalBillsRemainingCents: 75000,
      latestBillBurdenPercent: 22.5,
    },
    wallets: [
      {
        walletId: "wallet-1",
        walletName: "Main account",
        walletType: "Bank account",
        currency: "USD",
        currentBalanceCents: 500000,
        currentBalanceInBaseCents: 500000,
        owedCents: 25000,
        owedInBaseCents: 25000,
      },
    ],
    currencyExposure: [
      {
        currency: "USD",
        transactionCount: 2,
        totalAmountCents: 300000,
      },
    ],
    monthlyCashflow: [
      {
        month: "2026-03-01",
        incomeCents: 200000,
        expenseCents: 100000,
        netCents: 100000,
        billBurdenPercent: 22.5,
      },
    ],
    expenseCategories: [
      {
        categoryName: "Rent",
        totalCents: 100000,
        percentage: 50,
      },
    ],
    notableSignals: ["Rent accounts for 50% of tracked expenses."],
    bills: [
      {
        id: "bill-1",
        walletId: "wallet-1",
        walletName: "Main account",
        dueDate: "2026-03-20",
        description: "Rent",
        currency: "USD",
        amountCents: 125000,
        paidAmountCents: 50000,
        remainingCents: 75000,
        status: "partial",
      },
    ],
    transactions: [
      {
        id: "tx-1",
        date: "2026-03-01",
        type: "income",
        description: "Salary",
        walletId: "wallet-1",
        walletName: "Main account",
        currency: "USD",
        amountCents: 200000,
        amountInBaseCents: 200000,
        categoryId: null,
        labelId: null,
        tags: [],
        note: null,
        transferId: null,
      },
    ],
    recentTransactions: [
      {
        id: "tx-1",
        date: "2026-03-01",
        type: "income",
        description: "Salary",
        walletName: "Main account",
        currency: "USD",
        amountCents: 200000,
        amountInBaseCents: 200000,
      },
    ],
  };
}

describe("workspace financial report formatting", () => {
  it("renders the required markdown sections", () => {
    const markdown = buildWorkspaceFinancialReportMarkdown(createReport());

    expect(markdown).toContain("# Financial Advisor Report: Kino");
    expect(markdown).toContain("## Workspace Overview");
    expect(markdown).toContain("## Advisor Context");
    expect(markdown).toContain("## Coverage and Limitations");
    expect(markdown).toContain("## Debt and Bills Summary");
    expect(markdown).toContain("## Recent Activity");
    expect(markdown).toContain("off-platform investment holdings");
  });

  it("creates the expected export bundle files", () => {
    const exports = buildWorkspaceFinancialReportExports(createReport());
    const filenames = exports.csvFiles.map((file) => file.filename);

    expect(exports.markdown.filename).toMatch(/kino-financial-report-all-time/);
    expect(filenames).toHaveLength(7);
    expect(filenames.some((name) => name.endsWith("-report_summary.csv"))).toBe(
      true,
    );
    expect(filenames.some((name) => name.endsWith("-transactions.csv"))).toBe(
      true,
    );
    expect(
      exports.csvFiles.find((file) => file.filename.endsWith("-advisor_profile.csv"))
        ?.content,
    ).toContain("country_of_residence");
  });
});
