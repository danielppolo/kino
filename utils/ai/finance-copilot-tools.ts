import {
  getBillBurdenRatio,
  getCashFlowAfterBills,
  listTransactions,
} from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";
import type { Wallet } from "@/utils/supabase/types";

import { buildFinancialBriefing } from "./finance-copilot-builders";
import {
  BillOverviewArgsSchema,
  CategoryDrilldownArgsSchema,
  ForecastDetailsArgsSchema,
  GetTransactionsArgsSchema,
  ToolScopeSchema,
} from "./finance-copilot-schemas";
import type { FinancialBriefingScope, FinancialToolContext } from "./finance-copilot-types";

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

function getWorkspaceWalletScope(wallets: Wallet[], walletId?: string) {
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
