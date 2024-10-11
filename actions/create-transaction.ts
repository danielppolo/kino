"use server";

import { revalidatePath } from "next/cache";

import { Database } from "@/utils/supabase/database.types";
import { createClient } from "@/utils/supabase/server";

export const createTransaction = async (
  data: Database["public"]["Tables"]["transactions"]["Insert"],
) => {
  const supabase = createClient();
  const transaction = {
    ...data,
    amount_cents:
      data.type === "expense" ? -data.amount_cents : data.amount_cents,
  };
  revalidatePath("/app/(app)/transactions", "page");
  return await supabase.from("transactions").upsert(transaction).select();
};
