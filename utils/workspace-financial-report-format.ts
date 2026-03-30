import { format } from "date-fns";
import Papa from "papaparse";

import { formatCents } from "@/utils/format-cents";

import type {
  WorkspaceFinancialReport,
  WorkspaceFinancialReportExports,
} from "./workspace-financial-report-types";

function formatPeriodLabel(from: string | null, to: string | null) {
  if (!from && !to) {
    return "All time";
  }

  if (from && to) {
    return `${from} to ${to}`;
  }

  if (from) {
    return `From ${from}`;
  }

  return `Through ${to}`;
}

function formatList(items: string[]) {
  return items.length > 0 ? items.join(", ") : "Not provided";
}

function escapeMarkdownCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function markdownTable(headers: string[], rows: string[][]) {
  const head = `| ${headers.map(escapeMarkdownCell).join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => {
    return `| ${row.map((cell) => escapeMarkdownCell(cell)).join(" | ")} |`;
  });

  return [head, divider, ...body].join("\n");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return "";
  }

  return Papa.unparse(rows);
}

export function buildWorkspaceFinancialReportMarkdown(
  report: WorkspaceFinancialReport,
) {
  const { baseCurrency } = report.workspace;
  const walletRows = report.wallets.map((wallet) => [
    wallet.walletName,
    wallet.walletType,
    wallet.currency,
    formatCents(wallet.currentBalanceCents, wallet.currency),
    formatCents(wallet.currentBalanceInBaseCents, baseCurrency),
    formatCents(wallet.owedCents, wallet.currency),
  ]);
  const expenseRows = report.expenseCategories.map((category) => [
    category.categoryName,
    formatCents(category.totalCents, baseCurrency),
    `${category.percentage.toFixed(1)}%`,
  ]);
  const recentRows = report.recentTransactions.map((transaction) => [
    transaction.date,
    transaction.walletName,
    transaction.type,
    transaction.description,
    formatCents(transaction.amountCents, transaction.currency),
    formatCents(transaction.amountInBaseCents, baseCurrency),
  ]);

  return [
    `# Financial Advisor Report: ${report.workspace.name}`,
    "",
    "## Workspace Overview",
    `- Generated on: ${format(new Date(report.generatedAt), "yyyy-MM-dd HH:mm")}`,
    `- Reporting period: ${report.period.label}`,
    `- Base currency: ${baseCurrency}`,
    `- Included wallets: ${report.workspace.includedWalletCount}`,
    "",
    "## Advisor Context",
    `- Country of residence: ${report.advisorContext.countryOfResidence ?? "Not provided"}`,
    `- Tax region: ${report.advisorContext.taxRegion ?? "Not provided"}`,
    `- Preferred language: ${report.advisorContext.preferredLanguage ?? "Not provided"}`,
    `- Risk tolerance: ${report.advisorContext.riskTolerance ?? "Not provided"}`,
    `- Liquidity needs: ${report.advisorContext.liquidityNeeds ?? "Not provided"}`,
    `- Time horizon: ${report.advisorContext.timeHorizon ?? "Not provided"}`,
    `- Investment goals: ${formatList(report.advisorContext.investmentGoals)}`,
    `- Constraints: ${formatList(report.advisorContext.constraints)}`,
    `- Known limitations: ${formatList(report.advisorContext.knownLimitations)}`,
    `- Markets accessible: ${formatList(report.advisorContext.marketsAccessible)}`,
    `- Instruments accessible: ${formatList(report.advisorContext.instrumentsAccessible)}`,
    `- Brokerage platforms: ${formatList(report.advisorContext.brokeragePlatforms)}`,
    `- Account types: ${formatList(report.advisorContext.accountTypes)}`,
    "",
    "## Coverage and Limitations",
    `- Included coverage: ${report.coverage.includes.join(", ")}`,
    ...report.coverage.limitations.map((limitation) => `- ${limitation}`),
    "",
    "## Net Position Summary",
    `- Current wallet balances: ${formatCents(report.summary.totalBalanceCents, baseCurrency)}`,
    `- Outstanding bills/debt: ${formatCents(report.summary.totalOwedCents, baseCurrency)}`,
    `- Net tracked position: ${formatCents(report.summary.netTrackedPositionCents, baseCurrency)}`,
    "",
    "## Cash Flow Summary",
    `- Total income: ${formatCents(report.summary.totalIncomeCents, baseCurrency)}`,
    `- Total expenses: ${formatCents(report.summary.totalExpenseCents, baseCurrency)}`,
    `- Net cash flow: ${formatCents(report.summary.totalNetCashflowCents, baseCurrency)}`,
    `- Months in cash flow series: ${report.monthlyCashflow.length}`,
    "",
    "## Debt and Bills Summary",
    `- Open bills: ${report.summary.openBillsCount}`,
    `- Total bills owed: ${formatCents(report.summary.totalBillsOwedCents, baseCurrency)}`,
    `- Total paid: ${formatCents(report.summary.totalBillsPaidCents, baseCurrency)}`,
    `- Remaining: ${formatCents(report.summary.totalBillsRemainingCents, baseCurrency)}`,
    `- Latest bill burden: ${
      report.summary.latestBillBurdenPercent === null
        ? "Not available"
        : `${report.summary.latestBillBurdenPercent.toFixed(1)}%`
    }`,
    "",
    "## Wallet Summary",
    walletRows.length > 0
      ? markdownTable(
          [
            "Wallet",
            "Type",
            "Currency",
            "Current Balance",
            `Balance (${baseCurrency})`,
            "Outstanding Bills",
          ],
          walletRows,
        )
      : "No wallets available.",
    "",
    "## Top Spending Insights",
    expenseRows.length > 0
      ? markdownTable(
          ["Category", `Amount (${baseCurrency})`, "Share"],
          expenseRows,
        )
      : "No expense category data available.",
    "",
    ...report.notableSignals.length > 0
      ? ["### Notable Signals", ...report.notableSignals.map((signal) => `- ${signal}`), ""]
      : ["### Notable Signals", "- No material signals detected from the selected data.", ""],
    "## Recent Activity",
    recentRows.length > 0
      ? markdownTable(
          ["Date", "Wallet", "Type", "Description", "Original Amount", `Base Amount (${baseCurrency})`],
          recentRows,
        )
      : "No recent transactions available for the selected period.",
    "",
  ].join("\n");
}

export function buildWorkspaceFinancialReportExports(
  report: WorkspaceFinancialReport,
): WorkspaceFinancialReportExports {
  const dateStamp = format(new Date(report.generatedAt), "yyyy-MM-dd");
  const workspaceSlug = slugify(report.workspace.name || "workspace");
  const periodLabel = formatPeriodLabel(report.period.from, report.period.to)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const filePrefix = [workspaceSlug, "financial-report", periodLabel || "all-time", dateStamp]
    .filter(Boolean)
    .join("-");

  const markdown = buildWorkspaceFinancialReportMarkdown(report);
  const summaryCsv = toCsv([
    {
      workspace_name: report.workspace.name,
      workspace_id: report.workspace.id,
      generated_at: report.generatedAt,
      report_period: report.period.label,
      base_currency: report.workspace.baseCurrency,
      included_wallet_count: report.workspace.includedWalletCount,
      total_balance_base_cents: report.summary.totalBalanceCents,
      total_owed_base_cents: report.summary.totalOwedCents,
      net_tracked_position_base_cents: report.summary.netTrackedPositionCents,
      total_income_base_cents: report.summary.totalIncomeCents,
      total_expense_base_cents: report.summary.totalExpenseCents,
      total_net_cashflow_base_cents: report.summary.totalNetCashflowCents,
      open_bills_count: report.summary.openBillsCount,
      total_bills_owed_base_cents: report.summary.totalBillsOwedCents,
      total_bills_paid_base_cents: report.summary.totalBillsPaidCents,
      total_bills_remaining_base_cents: report.summary.totalBillsRemainingCents,
      latest_bill_burden_percent: report.summary.latestBillBurdenPercent,
    },
  ]);

  const walletsCsv = toCsv(
    report.wallets.map((wallet) => ({
      wallet_id: wallet.walletId,
      wallet_name: wallet.walletName,
      wallet_type: wallet.walletType,
      currency: wallet.currency,
      current_balance_cents: wallet.currentBalanceCents,
      current_balance_base_cents: wallet.currentBalanceInBaseCents,
      owed_cents: wallet.owedCents,
      owed_base_cents: wallet.owedInBaseCents,
    })),
  );

  const transactionsCsv = toCsv(
    report.transactions.map((transaction) => ({
      transaction_id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      description: transaction.description,
      wallet_id: transaction.walletId,
      wallet_name: transaction.walletName,
      currency: transaction.currency,
      amount_cents: transaction.amountCents,
      amount_base_cents: transaction.amountInBaseCents,
      category_id: transaction.categoryId,
      label_id: transaction.labelId,
      tags: transaction.tags.join(", "),
      note: transaction.note,
      transfer_id: transaction.transferId,
    })),
  );

  const billsCsv = toCsv(
    report.bills.map((bill) => ({
      bill_id: bill.id,
      wallet_id: bill.walletId,
      wallet_name: bill.walletName,
      due_date: bill.dueDate,
      description: bill.description,
      currency: bill.currency,
      amount_cents: bill.amountCents,
      paid_amount_cents: bill.paidAmountCents,
      remaining_cents: bill.remainingCents,
      status: bill.status,
    })),
  );

  const monthlyCashflowCsv = toCsv(
    report.monthlyCashflow.map((row) => ({
      month: row.month,
      income_base_cents: row.incomeCents,
      expense_base_cents: row.expenseCents,
      net_base_cents: row.netCents,
      bill_burden_percent: row.billBurdenPercent,
    })),
  );

  const expenseCategoriesCsv = toCsv(
    report.expenseCategories.map((category) => ({
      category_name: category.categoryName,
      total_base_cents: category.totalCents,
      percentage: category.percentage,
    })),
  );

  const advisorProfileCsv = toCsv(
    Object.entries(report.advisorContext.sourceProfile).map(([field, value]) => ({
      field,
      value: Array.isArray(value) ? value.join(", ") : value,
    })),
  );

  return {
    markdown: {
      filename: `${filePrefix}.md`,
      content: markdown,
    },
    csvFiles: [
      {
        filename: `${filePrefix}-report_summary.csv`,
        content: summaryCsv,
      },
      {
        filename: `${filePrefix}-wallets.csv`,
        content: walletsCsv,
      },
      {
        filename: `${filePrefix}-transactions.csv`,
        content: transactionsCsv,
      },
      {
        filename: `${filePrefix}-bills.csv`,
        content: billsCsv,
      },
      {
        filename: `${filePrefix}-monthly_cashflow.csv`,
        content: monthlyCashflowCsv,
      },
      {
        filename: `${filePrefix}-expense_categories.csv`,
        content: expenseCategoriesCsv,
      },
      {
        filename: `${filePrefix}-advisor_profile.csv`,
        content: advisorProfileCsv,
      },
    ],
  };
}
