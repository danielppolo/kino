import type { SupabaseClient } from "@supabase/supabase-js";

import { createTransaction } from "@/actions/create-transaction";
import { calculateNextRunDate } from "@/utils/recurring-transaction";
import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/utils/supabase/database.types";

export async function processRecurringTransactions(
  supabaseClient?: SupabaseClient<Database>,
) {
  const supabase = supabaseClient || (await createClient());

  const { data: recurrences, error } = await supabase
    .from("recurring_transactions")
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  const today = new Date();

  for (const r of recurrences || []) {
    const runDate = r.next_run_date || r.start_date;
    if (!runDate || !r.wallet_id || !r.label_id) continue;

    const endDate = r.end_date ? new Date(r.end_date) : null;
    let current = new Date(runDate);

    while (current <= today && (!endDate || current <= endDate)) {
      const dateStr = current.toISOString().split("T")[0];

      const result = await createTransaction(
        {
          amount: r.amount_cents / 100,
          type: r.type,
          date: dateStr,
          description: r.description ?? undefined,
          category_id: r.category_id,
          label_id: r.label_id ?? undefined,
          wallet_id: r.wallet_id,
          currency: r.currency,
          tags: r.tags ?? undefined,
        },
        supabase,
      );

      if (!result.success) {
        throw new Error(result.error ?? "Failed to create transaction");
      }

      current = calculateNextRunDate(current, r.interval_type);
    }

    await supabase
      .from("recurring_transactions")
      .update({ next_run_date: current.toISOString().split("T")[0] })
      .eq("id", r.id);
  }

  return { success: true, timestamp: new Date().toISOString() };
}
