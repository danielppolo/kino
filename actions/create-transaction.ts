"use server";

import { revalidatePath } from "next/cache";

import { Database } from "@/utils/supabase/database.types";
import { createClient } from "@/utils/supabase/server";

type Transaction = Omit<
  Database["public"]["Tables"]["transactions"]["Insert"],
  "amount_cents"
> & {
  amount: number;
};

export const createTransaction = async ({
  amount,
  ...transaction
}: Transaction) => {
  const supabase = createClient();
  const data = {
    ...transaction,
    amount_cents: transaction.type === "expense" ? -amount * 100 : amount * 100,
  };
  revalidatePath("/app/(app)/transactions", "page");
  return await supabase.from("transactions").upsert(data).select();
};
