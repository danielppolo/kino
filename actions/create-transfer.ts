"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

import { Database } from "@/utils/supabase/database.types";
import { createClient } from "@/utils/supabase/server";

type SourceTransaction = Omit<
  Database["public"]["Tables"]["transactions"]["Insert"],
  "amount_cents"
> & {
  amount: number;
};

export async function createTransferTransaction(
  { amount, ...sourceTransaction }: SourceTransaction,
  counterpartWalletId: string,
) {
  const supabase = createClient();
  const transferId = uuidv4();
  const transactionsToInsert = [
    {
      ...sourceTransaction,
      amount_cents: -amount * 100,
      transfer_id: transferId,
      category_id: process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID,
    },
    {
      ...sourceTransaction,
      wallet_id: counterpartWalletId,
      amount_cents: amount * 100,
      transfer_id: transferId,
      category_id: process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID,
    } as const,
  ];

  const { data, error } = await supabase
    .from("transactions")
    .insert(transactionsToInsert)
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
