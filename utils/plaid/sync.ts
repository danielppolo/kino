import { SupabaseClient } from "@supabase/supabase-js";

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

import { Database } from "@/utils/supabase/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;
type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

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
  const transactionByPlaidId = new Map<string, PlaidFetchedTransaction>();

  transactions.forEach((transaction) => {
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

  const plaidTransactionIds = transactionsToStore.map(
    (transaction) => transaction.plaid_transaction_id,
  );

  const { data: existingTransactions, error: existingTransactionsError } =
    plaidTransactionIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("transactions")
          .select("id, category_id, label_id, note, plaid_transaction_id")
          .in("plaid_transaction_id", plaidTransactionIds);

  if (existingTransactionsError) {
    throw existingTransactionsError;
  }

  const existingByPlaidId = new Map(
    (existingTransactions ?? []).map((transaction) => [
      transaction.plaid_transaction_id,
      transaction,
    ]),
  );

  const transactionRows: TransactionInsert[] = transactionsToStore.map(
    (transaction) => {
      const transactionDate = transaction.date;
      const amountData = mapPlaidAmountToTransaction(transaction.amount);
      const existingTransaction = existingByPlaidId.get(
        transaction.plaid_transaction_id,
      );

      return {
        amount_cents: amountData.amount_cents,
        category_id:
          existingTransaction?.category_id ??
          (transaction.plaid_merchant_key
            ? (learnedRuleCategoryByMerchantKey.get(
                transaction.plaid_merchant_key,
              ) ?? null)
            : null),
        conversion_rate_to_base: null,
        currency: transaction.currency || wallet.currency,
        date: transactionDate,
        description: transaction.merchant_name || transaction.name,
        label_id: existingTransaction?.label_id ?? null,
        note: existingTransaction?.note ?? null,
        plaid_merchant_key: transaction.plaid_merchant_key,
        plaid_merchant_name:
          transaction.plaid_merchant_name ?? transaction.merchant_name ?? null,
        plaid_personal_finance_category_primary:
          transaction.plaid_personal_finance_category_primary,
        plaid_transaction_id: transaction.plaid_transaction_id,
        type: amountData.type,
        wallet_id: wallet.id,
      };
    },
  );

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
    (transaction) => !existingByPlaidId.has(transaction.plaid_transaction_id),
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
