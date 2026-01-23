"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/utils/supabase/server";

export interface BulkTransactionUpdate {
  category_id?: string | null;
  label_id?: string | null;
  date?: string;
  tags?: string[];
}

const BATCH_SIZE = 20;

// Helper to chunk array into batches
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
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
  if (updates.category_id !== undefined)
    updatePayload.category_id = updates.category_id;
  if (updates.label_id !== undefined) updatePayload.label_id = updates.label_id;
  if (updates.date !== undefined) updatePayload.date = updates.date;

  // Process in batches of 20
  const batches = chunk(ids, BATCH_SIZE);

  // Process each batch sequentially
  for (const batchIds of batches) {
    // Update transaction fields for this batch
    if (Object.keys(updatePayload).length) {
      const { error } = await supabase
        .from("transactions")
        .update(updatePayload)
        .in("id", batchIds);
      if (error) return { error: error.message };
    }

    // Handle tags for this batch
    if (updates.tags !== undefined) {
      // Delete existing tags for this batch
      const { error: delError } = await supabase
        .from("transaction_tags")
        .delete()
        .in("transaction_id", batchIds);
      if (delError) return { error: delError.message };

      // Insert new tags for this batch
      if (updates.tags.length) {
        const rows = batchIds.flatMap((id) =>
          updates.tags!.map((tagId) => ({ transaction_id: id, tag_id: tagId })),
        );
        const { error: insertError } = await supabase
          .from("transaction_tags")
          .upsert(rows);
        if (insertError) return { error: insertError.message };
      }
    }
  }

  revalidatePath("/app/transactions", "page");
  return { error: null };
};
