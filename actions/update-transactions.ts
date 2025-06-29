"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export interface BulkTransactionUpdate {
  category_id?: string | null;
  label_id?: string | null;
  date?: string;
  tags?: string[];
}

export const updateTransactions = async (
  ids: string[],
  updates: BulkTransactionUpdate,
) => {
  const supabase = await createClient();

  if (ids.length === 0) {
    return { error: "No transactions selected" };
  }

  const updatePayload: Record<string, unknown> = {};
  if (updates.category_id !== undefined) updatePayload.category_id = updates.category_id;
  if (updates.label_id !== undefined) updatePayload.label_id = updates.label_id;
  if (updates.date !== undefined) updatePayload.date = updates.date;

  if (Object.keys(updatePayload).length) {
    const { error } = await supabase
      .from("transactions")
      .update(updatePayload)
      .in("id", ids);
    if (error) return { error: error.message };
  }

  if (updates.tags !== undefined) {
    const { error: delError } = await supabase
      .from("transaction_tags")
      .delete()
      .in("transaction_id", ids);
    if (delError) return { error: delError.message };
    if (updates.tags.length) {
      const rows = ids.flatMap((id) =>
        updates.tags!.map((tagId) => ({ transaction_id: id, tag_id: tagId })),
      );
      const { error: insertError } = await supabase
        .from("transaction_tags")
        .upsert(rows);
      if (insertError) return { error: insertError.message };
    }
  }

  revalidatePath("/app/transactions", "page");
  return { error: null };
};
