"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

import { Database } from "@/utils/supabase/database.types";
import { createClient } from "@/utils/supabase/server";

export async function createTransferTransaction(
  sourceTransaction: Database["public"]["Tables"]["transactions"]["Insert"],
  counterpartWalletId: string,
) {
  const supabase = createClient();
  const transferId = uuidv4();
  const transactionsToInsert = [
    {
      ...sourceTransaction,
      amount_cents: -sourceTransaction.amount_cents,
      transfer_id: transferId,
    },
    {
      ...sourceTransaction,
      wallet_id: counterpartWalletId,
      amount_cents: sourceTransaction.amount_cents,
      transfer_id: transferId,
    } as const,
  ];

  const { data, error } = await supabase
    .from("transactions")
    .insert(transactionsToInsert)
    .select();

  if (error) {
    return { error, data: null };
  }

  const [sourceData, destData] = data;

  revalidatePath("/transactions");

  return {
    data: { sourceTransaction: sourceData, destinationTransaction: destData },
    error: null,
  };
}
