"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

import { createClient } from "@/utils/supabase/server";

export const linkTransfers = async (
  originTransactionId: string,
  targetTransactionId: string,
) => {
  const supabase = createClient();
  const transferId = uuidv4();

  revalidatePath("/app/transactions", "page");
  return await supabase
    .from("transactions")
    .update({
      transfer_id: transferId,
      category_id: process.env.TRANSFER_CATEGORY_BETWEEN_ID,
    })
    .or(`id.eq.${originTransactionId},id.eq.${targetTransactionId}`)
    .select();
};
