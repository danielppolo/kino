"use server";

import { omitBy } from "lodash";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

import { Database } from "@/utils/supabase/database.types";
import { createClient } from "@/utils/supabase/server";

type SourceTransaction = Omit<
  Database["public"]["Tables"]["transactions"]["Insert"],
  "amount_cents" | "currency" | "wallet_id"
> & {
  sender_amount: number;
  receiver_amount: number;
};

const isEmpty = (value: unknown) =>
  value === "" || value === null || value === undefined;

export async function createTransferTransaction(
  { sender_amount, receiver_amount, ...sourceTransaction }: SourceTransaction,
  senderWalletId: string,
  receiverWalletId: string,
  sourceTransactionId?: string,
) {
  if (senderWalletId === receiverWalletId) {
    return {
      error: "Sender and receiver wallets must be different",
      data: null,
    };
  }

  const senderAmountCents = Math.round(sender_amount * 100);
  const receiverAmountCents = Math.round(receiver_amount * 100);
  if (
    !Number.isFinite(sender_amount) ||
    senderAmountCents <= 0 ||
    !Number.isFinite(receiver_amount) ||
    receiverAmountCents <= 0
  ) {
    return {
      error: "Transfer amounts must be positive",
      data: null,
    };
  }

  const supabase = await createClient();
  const { data: wallets, error: walletsError } = await supabase
    .from("wallets")
    .select("id, currency, workspace_id")
    .in("id", [senderWalletId, receiverWalletId]);

  if (walletsError) {
    return { error: walletsError.message, data: null };
  }

  const senderWallet = wallets?.find((wallet) => wallet.id === senderWalletId);
  const receiverWallet = wallets?.find(
    (wallet) => wallet.id === receiverWalletId,
  );

  if (!senderWallet || !receiverWallet) {
    return { error: "Sender or receiver wallet not found", data: null };
  }

  if (senderWallet.workspace_id !== receiverWallet.workspace_id) {
    return {
      error: "Sender and receiver wallets must belong to the same workspace",
      data: null,
    };
  }

  const transferId = uuidv4();
  const transactionsToInsert = [
    omitBy(
      {
        ...sourceTransaction,
        ...(sourceTransactionId ? { id: sourceTransactionId } : {}),
        wallet_id: senderWalletId,
        currency: senderWallet.currency,
        amount_cents: -senderAmountCents,
        transfer_id: transferId,
        category_id: process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID,
      },
      isEmpty,
    ),
    omitBy(
      {
        ...sourceTransaction,
        ...(sourceTransactionId ? { id: uuidv4() } : {}),
        wallet_id: receiverWalletId,
        currency: receiverWallet.currency,
        amount_cents: receiverAmountCents,
        transfer_id: transferId,
        category_id: process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID,
      },
      isEmpty,
    ),
  ];

  type TransactionInsert =
    Database["public"]["Tables"]["transactions"]["Insert"];
  if (sourceTransactionId) {
    const { data: existingSource, error: existingSourceError } = await supabase
      .from("transactions")
      .select("id, wallet_id, transfer_id")
      .eq("id", sourceTransactionId)
      .maybeSingle();

    if (existingSourceError) {
      return { error: existingSourceError.message, data: null };
    }
    if (!existingSource || existingSource.wallet_id !== senderWalletId) {
      return {
        error: "Source transaction not found in sender wallet",
        data: null,
      };
    }
    if (existingSource.transfer_id) {
      return {
        error: "Source transaction already belongs to a transfer",
        data: null,
      };
    }
  }

  const transactionQuery = supabase.from("transactions");
  const { data, error } = sourceTransactionId
    ? await transactionQuery
        .upsert(transactionsToInsert as TransactionInsert[], {
          onConflict: "id",
        })
        .select()
    : await transactionQuery
        .insert(transactionsToInsert as TransactionInsert[])
        .select();

  if (error) {
    return { error: error.message };
  }

  const [sourceData, destData] = data;

  revalidatePath("/app/transactions");

  return {
    data: { sourceTransaction: sourceData, destinationTransaction: destData },
    error: null,
  };
}
