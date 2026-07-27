import { v4 as randomUUID } from "uuid";

import { SupabaseClient } from "@supabase/supabase-js";

import {
  decryptWalletAccessToken,
  fetchPlaidTransactions,
  getPlaidPreviewTransactions,
  serializeWalletPlaidConnection,
  transactionMatchesImportStart,
} from "./server";
import type {
  PlaidFetchedTransaction,
  PlaidTransactionsResponse,
} from "./types";

import { fetchConversion } from "@/utils/fetch-conversions-server";
import { Database } from "@/utils/supabase/database.types";
import {
  parseTransactionRuleRow,
  resolveTransactionRules,
} from "@/utils/transaction-rules";
import {
  DEFAULT_FEATURE_FLAGS,
  parseFeatureFlags,
} from "@/utils/types/feature-flags";

type TypedSupabaseClient = SupabaseClient<Database>;
type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];

function mapPlaidAmountToTransaction(
  amount: number,
): Pick<TransactionInsert, "amount_cents" | "type"> {
  const normalizedAmount = Math.round(Math.abs(amount) * 100);

  if (amount >= 0) {
    return {
      amount_cents: -normalizedAmount,
      type: "expense",
    };
  }

  return {
    amount_cents: normalizedAmount,
    type: "income",
  };
}

function getUniquePlaidTransactions(transactions: PlaidFetchedTransaction[]) {
  const postedPendingIds = new Set(
    transactions
      .filter((transaction) => !transaction.pending)
      .map((transaction) => transaction.pending_transaction_id)
      .filter((value): value is string => Boolean(value)),
  );
  const transactionByPlaidId = new Map<string, PlaidFetchedTransaction>();

  transactions.forEach((transaction) => {
    if (
      transaction.pending &&
      postedPendingIds.has(transaction.plaid_transaction_id)
    ) {
      return;
    }

    const existingTransaction = transactionByPlaidId.get(
      transaction.plaid_transaction_id,
    );

    if (!existingTransaction) {
      transactionByPlaidId.set(transaction.plaid_transaction_id, transaction);
      return;
    }

    if (existingTransaction.pending && !transaction.pending) {
      transactionByPlaidId.set(transaction.plaid_transaction_id, transaction);
    }
  });

  return Array.from(transactionByPlaidId.values());
}

function getRateKey(currency: string, date: string) {
  return `${currency}:${date}`;
}

export async function syncWalletPlaidTransactions({
  supabase,
  wallet,
  accessToken,
  fetchStartAt,
  importStartAt,
}: {
  supabase: TypedSupabaseClient;
  wallet: WalletRow;
  accessToken: string;
  fetchStartAt?: string | null;
  importStartAt?: string | null;
}): Promise<PlaidTransactionsResponse> {
  if (!wallet.plaid_account_id) {
    throw new Error("Wallet is not linked to a Plaid account");
  }

  const effectiveImportStartAt = importStartAt ?? wallet.plaid_sync_start_at;
  const transactions = await fetchPlaidTransactions({
    accessToken,
    accountId: wallet.plaid_account_id,
    startDate: fetchStartAt ?? effectiveImportStartAt ?? undefined,
  });

  const importableTransactions = getUniquePlaidTransactions(
    transactions.filter((transaction) =>
      transactionMatchesImportStart(transaction, effectiveImportStartAt),
    ),
  );

  const plaidLookupIds = Array.from(
    new Set(
      importableTransactions.flatMap((transaction) => [
        transaction.plaid_transaction_id,
        transaction.pending_transaction_id,
      ]),
    ),
  ).filter((value): value is string => Boolean(value));

  const { data: ignoredTransactions, error: ignoredTransactionsError } =
    plaidLookupIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("plaid_ignored_transaction_ids")
          .select("plaid_transaction_id")
          .eq("wallet_id", wallet.id)
          .in("plaid_transaction_id", plaidLookupIds);

  if (ignoredTransactionsError) {
    throw ignoredTransactionsError;
  }

  const ignoredPlaidTransactionIds = new Set(
    (ignoredTransactions ?? []).map(
      (transaction) => transaction.plaid_transaction_id,
    ),
  );

  const transactionsToStore = importableTransactions.filter(
    (transaction) =>
      !ignoredPlaidTransactionIds.has(transaction.plaid_transaction_id) &&
      (!transaction.pending_transaction_id ||
        !ignoredPlaidTransactionIds.has(transaction.pending_transaction_id)),
  );

  const [
    { data: ruleRows, error: rulesError },
    { data: workspace, error: workspaceError },
  ] = await Promise.all([
    supabase
      .from("transaction_rules")
      .select("*")
      .eq("workspace_id", wallet.workspace_id)
      .eq("enabled", true)
      .eq("trigger_source", "plaid")
      .order("priority")
      .order("created_at"),
    supabase
      .from("workspaces")
      .select("base_currency, feature_flags")
      .eq("id", wallet.workspace_id)
      .single(),
  ]);

  if (workspaceError || !workspace) {
    throw workspaceError ?? new Error("Workspace not found");
  }
  if (rulesError) throw rulesError;

  const rules = (ruleRows ?? []).map(parseTransactionRuleRow);
  const ruleCategoryIds = Array.from(
    new Set(
      rules
        .map((rule) => rule.actions.categoryId)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const { data: ruleCategories, error: ruleCategoriesError } =
    ruleCategoryIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("categories")
          .select("id, type")
          .eq("workspace_id", wallet.workspace_id)
          .in("id", ruleCategoryIds);
  if (ruleCategoriesError) throw ruleCategoriesError;
  const ruleCategoryTypeById = new Map(
    (ruleCategories ?? []).map((category) => [category.id, category.type]),
  );

  const baseCurrency = workspace.base_currency;
  const featureFlags = workspace.feature_flags
    ? parseFeatureFlags(workspace.feature_flags)
    : DEFAULT_FEATURE_FLAGS;
  const conversionRatesByCurrencyDate = new Map<string, number>();
  const conversionRateRequests = Array.from(
    new Map(
      transactionsToStore.map((transaction) => {
        const currency = transaction.currency || wallet.currency;
        return [
          getRateKey(currency, transaction.date),
          {
            currency,
            date: transaction.date,
          },
        ];
      }),
    ).values(),
  );

  await Promise.all(
    conversionRateRequests.map(async ({ currency, date }) => {
      if (currency === baseCurrency) {
        conversionRatesByCurrencyDate.set(getRateKey(currency, date), 1);
        return;
      }

      const conversion = await fetchConversion({
        sourceCurrency: baseCurrency,
        targetCurrency: currency,
        date,
        supabaseClient: supabase,
      });
      conversionRatesByCurrencyDate.set(
        getRateKey(currency, date),
        conversion.rate,
      );
    }),
  );

  const { data: existingTransactions, error: existingTransactionsError } =
    plaidLookupIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("transactions")
          .select(
            "id, category_id, description, label_id, note, plaid_pending_transaction_id, plaid_transaction_id",
          )
          .in("plaid_transaction_id", plaidLookupIds);

  if (existingTransactionsError) {
    throw existingTransactionsError;
  }

  const existingByPlaidId = new Map(
    (existingTransactions ?? []).map((transaction) => [
      transaction.plaid_transaction_id,
      transaction,
    ]),
  );

  const transactionRows: TransactionInsert[] = [];
  const ruleApplicationRows: Database["public"]["Tables"]["transaction_rule_applications"]["Insert"][] =
    [];
  const ruleTagRows: Database["public"]["Tables"]["transaction_tags"]["Insert"][] =
    [];
  const pendingTransactionUpdates: Array<{
    id: string;
    row: TransactionUpdate;
  }> = [];
  const pendingTransactionIdsToDelete = new Set<string>();
  const ontologyRuleCandidates = new Map<
    string,
    Array<{ entity_type: string; ontology_entity_id: string }>
  >();

  transactionsToStore.forEach((transaction) => {
    const transactionDate = transaction.date;
    const amountData = mapPlaidAmountToTransaction(transaction.amount);
    const currency = transaction.currency || wallet.currency;
    const conversionRate =
      conversionRatesByCurrencyDate.get(
        getRateKey(currency, transactionDate),
      ) ?? 1;
    const baseAmountCents = Math.round(
      Math.abs(amountData.amount_cents) * conversionRate,
    );
    const signedBaseAmountCents =
      amountData.type === "expense" ? -baseAmountCents : baseAmountCents;
    const currentExistingTransaction = existingByPlaidId.get(
      transaction.plaid_transaction_id,
    );
    const pendingExistingTransaction = transaction.pending_transaction_id
      ? existingByPlaidId.get(transaction.pending_transaction_id)
      : undefined;
    const existingTransaction =
      currentExistingTransaction ?? pendingExistingTransaction;

    if (
      currentExistingTransaction?.id &&
      pendingExistingTransaction?.id &&
      currentExistingTransaction.id !== pendingExistingTransaction.id
    ) {
      pendingTransactionIdsToDelete.add(pendingExistingTransaction.id);
    }

    const transactionId = currentExistingTransaction?.id ?? randomUUID();
    const ruleResolution =
      existingTransaction || rules.length === 0
        ? undefined
        : resolveTransactionRules({
            candidate: {
              amountCents: amountData.amount_cents,
              currency,
              description: transaction.merchant_name || transaction.name,
              merchantKey: transaction.plaid_merchant_key,
              merchantName:
                transaction.plaid_merchant_name ??
                transaction.merchant_name ??
                null,
              plaidCategory:
                transaction.plaid_personal_finance_category_primary,
              type: amountData.type,
              walletId: wallet.id,
            },
            rules: rules.map((rule) => {
              const categoryId = rule.actions.categoryId;
              if (
                !categoryId ||
                ruleCategoryTypeById.get(categoryId) === amountData.type
              ) {
                return rule;
              }
              return {
                ...rule,
                actions: { ...rule.actions, categoryId: undefined },
              };
            }),
          });

    const transactionRow = {
      amount_cents: amountData.amount_cents,
      base_amount_cents: signedBaseAmountCents,
      category_id:
        existingTransaction?.category_id ??
        ruleResolution?.categoryId ??
        null,
      conversion_rate_to_base: conversionRate,
      currency,
      date: transactionDate,
      description:
        existingTransaction?.description ??
        (transaction.merchant_name || transaction.name),
      label_id: existingTransaction?.label_id ?? ruleResolution?.labelId ?? null,
      note: existingTransaction?.note ?? null,
      plaid_merchant_key: transaction.plaid_merchant_key,
      plaid_merchant_name:
        transaction.plaid_merchant_name ?? transaction.merchant_name ?? null,
      plaid_pending_transaction_id: transaction.pending_transaction_id,
      plaid_personal_finance_category_primary:
        transaction.plaid_personal_finance_category_primary,
      plaid_transaction_id: transaction.plaid_transaction_id,
      type: amountData.type,
      wallet_id: wallet.id,
    } satisfies TransactionInsert;

    if (ruleResolution) {
      ruleTagRows.push(
        ...ruleResolution.tagIds.map((tagId) => ({
          tag_id: tagId,
          transaction_id: transactionId,
        })),
      );
      ruleApplicationRows.push(
        ...ruleResolution.applications.map((application) => ({
          applied_actions: application.appliedActions,
          execution_mode: "live",
          rule_id: application.ruleId,
          transaction_id: transactionId,
        })),
      );
      if (
        featureFlags.ontology_associations_enabled &&
        ruleResolution.ontologyAssociations.length > 0
      ) {
        ontologyRuleCandidates.set(
          transactionId,
          ruleResolution.ontologyAssociations.map((association) => ({
            entity_type: association.type,
            ontology_entity_id: association.ontologyId,
          })),
        );
      }
    }

    if (!currentExistingTransaction && pendingExistingTransaction?.id) {
      pendingTransactionUpdates.push({
        id: pendingExistingTransaction.id,
        row: transactionRow,
      });
      return;
    }

    if (currentExistingTransaction?.id) {
      transactionRows.push({
        ...transactionRow,
        id: currentExistingTransaction.id,
      });
    } else {
      transactionRows.push({
        ...transactionRow,
        id: transactionId,
      });
    }
  });

  for (const { id, row } of pendingTransactionUpdates) {
    const { error } = await supabase
      .from("transactions")
      .update(row)
      .eq("id", id);

    if (error) {
      throw error;
    }
  }

  if (pendingTransactionIdsToDelete.size > 0) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .in("id", Array.from(pendingTransactionIdsToDelete));

    if (error) {
      throw error;
    }
  }

  if (transactionRows.length > 0) {
    const { error } = await supabase
      .from("transactions")
      .upsert(transactionRows, { onConflict: "plaid_transaction_id" })
      .select("id, plaid_transaction_id");

    if (error) {
      throw error;
    }
  }

  if (ruleTagRows.length > 0) {
    const { error } = await supabase
      .from("transaction_tags")
      .upsert(ruleTagRows, { onConflict: "transaction_id,tag_id" });
    if (error) throw error;
  }

  if (ruleApplicationRows.length > 0) {
    const { error } = await supabase
      .from("transaction_rule_applications")
      .upsert(ruleApplicationRows, {
        onConflict: "rule_id,transaction_id,execution_mode",
      });
    if (error) throw error;
  }

  if (ontologyRuleCandidates.size > 0) {
    const candidateTransactionIds = Array.from(ontologyRuleCandidates.keys());
    const { data: existingAssociations, error: existingAssociationsError } =
      await supabase
        .from("transaction_ontology_associations")
        .select("transaction_id")
        .in("transaction_id", candidateTransactionIds);

    if (existingAssociationsError) {
      throw existingAssociationsError;
    }

    const transactionIdsWithContext = new Set(
      (existingAssociations ?? []).map(
        (association) => association.transaction_id,
      ),
    );
    const associationRows = Array.from(ontologyRuleCandidates).flatMap(
      ([transactionId, associations]) =>
        transactionIdsWithContext.has(transactionId)
          ? []
          : associations.map((association) => ({
              transaction_id: transactionId,
              ontology_entity_id: association.ontology_entity_id,
              entity_type: association.entity_type,
            })),
    );

    if (associationRows.length > 0) {
      const { error: associationInsertError } = await supabase
        .from("transaction_ontology_associations")
        .insert(associationRows);
      if (associationInsertError) {
        throw associationInsertError;
      }
    }
  }

  const importedCount = transactionsToStore.filter(
    (transaction) =>
      !existingByPlaidId.has(transaction.plaid_transaction_id) &&
      (!transaction.pending_transaction_id ||
        !existingByPlaidId.has(transaction.pending_transaction_id)),
  ).length;

  return {
    connection: serializeWalletPlaidConnection({
      plaid_account_id: wallet.plaid_account_id,
      plaid_account_mask: wallet.plaid_account_mask,
      plaid_account_name: wallet.plaid_account_name,
      plaid_institution_name: wallet.plaid_institution_name,
      plaid_item_id: wallet.plaid_item_id,
      plaid_last_refreshed_at: wallet.plaid_last_refreshed_at,
      plaid_sync_enabled: wallet.plaid_sync_enabled,
      plaid_sync_start_at: effectiveImportStartAt ?? null,
    }),
    importedCount,
    transactions: getPlaidPreviewTransactions(
      getUniquePlaidTransactions(transactions),
    ),
  };
}

export async function syncPlaidTransactionsForCron({
  supabase,
}: {
  supabase: TypedSupabaseClient;
}) {
  const { data: wallets, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("wallet_type", "bank_account")
    .eq("plaid_sync_enabled", true)
    .not("plaid_access_token_encrypted", "is", null)
    .not("plaid_account_id", "is", null)
    .order("plaid_last_refreshed_at", {
      ascending: true,
      nullsFirst: true,
    });

  if (error) {
    throw error;
  }

  let importedCount = 0;
  const syncedWallets: Array<{
    id: string;
    importedCount: number;
  }> = [];
  const skippedWallets: Array<{
    id: string;
    reason: string;
  }> = [];
  const failedWallets: Array<{
    id: string;
    error: string;
  }> = [];

  for (const wallet of wallets ?? []) {
    if (
      !wallet.plaid_access_token_encrypted ||
      !wallet.plaid_account_id ||
      !wallet.plaid_sync_start_at
    ) {
      skippedWallets.push({
        id: wallet.id,
        reason: "Wallet is missing Plaid sync settings",
      });
      continue;
    }

    try {
      const plaidLastRefreshedAt = new Date().toISOString();
      const { data: updatedWallet, error: updateError } = await supabase
        .from("wallets")
        .update({ plaid_last_refreshed_at: plaidLastRefreshedAt })
        .eq("id", wallet.id)
        .select("*")
        .single();

      if (updateError || !updatedWallet) {
        throw updateError ?? new Error("Failed to update wallet timestamp");
      }

      const syncResult = await syncWalletPlaidTransactions({
        supabase,
        wallet: updatedWallet,
        accessToken: decryptWalletAccessToken(
          wallet.plaid_access_token_encrypted,
        ),
        importStartAt: wallet.plaid_sync_start_at,
      });

      importedCount += syncResult.importedCount;
      syncedWallets.push({
        id: wallet.id,
        importedCount: syncResult.importedCount,
      });
    } catch (error) {
      failedWallets.push({
        id: wallet.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    success: failedWallets.length === 0,
    importedCount,
    syncedWallets,
    skippedWallets,
    failedWallets,
    timestamp: new Date().toISOString(),
  };
}
