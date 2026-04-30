import { SupabaseClient } from "@supabase/supabase-js";
import { v4 as randomUUID } from "uuid";

import {
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
  importStartAt,
}: {
  supabase: TypedSupabaseClient;
  wallet: WalletRow;
  accessToken: string;
  importStartAt?: string | null;
}): Promise<PlaidTransactionsResponse> {
  if (!wallet.plaid_account_id) {
    throw new Error("Wallet is not linked to a Plaid account");
  }

  const effectiveImportStartAt = importStartAt ?? wallet.plaid_sync_start_at;
  const transactions = await fetchPlaidTransactions({
    accessToken,
    accountId: wallet.plaid_account_id,
    startDate: effectiveImportStartAt ?? undefined,
  });

  const transactionsToStore = getUniquePlaidTransactions(
    transactions.filter((transaction) =>
      transactionMatchesImportStart(transaction, effectiveImportStartAt),
    ),
  );

  const merchantKeys = Array.from(
    new Set(
      transactionsToStore
        .map((transaction) => transaction.plaid_merchant_key)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const { data: learnedRules, error: learnedRulesError } =
    merchantKeys.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("plaid_transaction_rules")
          .select("merchant_key, category_id")
          .eq("wallet_id", wallet.id)
          .in("merchant_key", merchantKeys);

  if (learnedRulesError) {
    throw learnedRulesError;
  }

  const learnedRuleCategoryByMerchantKey = new Map(
    (learnedRules ?? []).map((rule) => [rule.merchant_key, rule.category_id]),
  );

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("base_currency")
    .eq("id", wallet.workspace_id)
    .single();

  if (workspaceError || !workspace) {
    throw workspaceError ?? new Error("Workspace not found");
  }

  const baseCurrency = workspace.base_currency;
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
      });
      conversionRatesByCurrencyDate.set(
        getRateKey(currency, date),
        conversion.rate,
      );
    }),
  );

  const plaidLookupIds = Array.from(
    new Set(
      transactionsToStore.flatMap((transaction) => [
        transaction.plaid_transaction_id,
        transaction.pending_transaction_id,
      ]),
    ),
  ).filter((value): value is string => Boolean(value));

  const { data: existingTransactions, error: existingTransactionsError } =
    plaidLookupIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("transactions")
          .select(
            "id, category_id, label_id, note, plaid_pending_transaction_id, plaid_transaction_id",
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
  const pendingTransactionUpdates: Array<{
    id: string;
    row: TransactionUpdate;
  }> = [];
  const pendingTransactionIdsToDelete = new Set<string>();

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

    const transactionRow = {
      amount_cents: amountData.amount_cents,
      base_amount_cents: signedBaseAmountCents,
      category_id:
        existingTransaction?.category_id ??
        (transaction.plaid_merchant_key
          ? (learnedRuleCategoryByMerchantKey.get(
              transaction.plaid_merchant_key,
            ) ?? null)
          : null),
      conversion_rate_to_base: conversionRate,
      currency,
      date: transactionDate,
      description: transaction.merchant_name || transaction.name,
      label_id: existingTransaction?.label_id ?? null,
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
        id: randomUUID(),
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
