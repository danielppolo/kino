"use server";

import { createClient } from "@/utils/supabase/server";

interface CreatePlaidTransactionRuleInput {
  categoryId: string;
  transactionId: string;
}

export async function createPlaidTransactionRule({
  categoryId,
  transactionId,
}: CreatePlaidTransactionRuleInput) {
  const supabase = await createClient();

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select(
      "id, wallet_id, plaid_transaction_id, plaid_merchant_key, plaid_merchant_name, description",
    )
    .eq("id", transactionId)
    .maybeSingle();

  if (transactionError) {
    return { error: transactionError.message };
  }

  if (!transaction?.plaid_transaction_id) {
    return {
      error: "Only Plaid-imported transactions can create learned rules",
    };
  }

  if (!transaction.wallet_id) {
    return { error: "Transaction wallet not found" };
  }

  if (!transaction.plaid_merchant_key) {
    return { error: "This transaction is missing a merchant key for learning" };
  }

  const { error: upsertError } = await supabase
    .from("plaid_transaction_rules")
    .upsert(
      {
        wallet_id: transaction.wallet_id,
        merchant_key: transaction.plaid_merchant_key,
        category_id: categoryId,
      },
      {
        onConflict: "wallet_id,merchant_key",
      },
    );

  if (upsertError) {
    return { error: upsertError.message };
  }

  return {
    error: null,
    merchantName:
      transaction.plaid_merchant_name ??
      transaction.description ??
      "this merchant",
  };
}
