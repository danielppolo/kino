"use server";

import Papa from "papaparse";

import { Filters, listTransactions } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

export async function exportTransactions(
  filters: Filters,
  workspaceWalletIds?: string[],
) {
  const supabase = await createClient();
  const { data: transactions, error } = await listTransactions(supabase, {
    ...filters,
    workspaceWalletIds,
  });

  if (error) {
    return { error, data: null };
  }

  const data = Papa.unparse({
    fields: Object.keys(transactions[0]),
    data: transactions,
  });

  return { data, error: null };
}
