import { Filters } from "@/app/protected/filter-context";
import { TypedSupabaseClient } from "@/utils/supabase/types";

export const listTransactions = (
  client: TypedSupabaseClient,
  params?: Filters,
) => {
  let query = client
    .from("transactions")
    .select("*", { count: "exact" })
    .order("date", { ascending: false });

  // Date range filtering
  if (params?.dateRange.from && params?.dateRange.to) {
    query = query
      .gte("date", params.dateRange.from.toISOString())
      .lte("date", params.dateRange.to.toISOString());
  }

  // Filter by category_id if available
  if (params?.category_id) {
    query = query.eq("category_id", params.category_id);
  }

  // Filter by subject_id if available
  if (params?.subject_id) {
    query = query.eq("subject_id", params.subject_id);
  }

  // Filter by wallet_id if available
  if (params?.wallet_id) {
    query = query.eq("wallet_id", params.wallet_id);
  }

  return query;
};

export const listCategories = (client: TypedSupabaseClient) => {
  return client.from("categories").select("*");
};

export const listSubjects = (client: TypedSupabaseClient) => {
  return client.from("subjects").select("*");
};

export const listWallets = (client: TypedSupabaseClient) => {
  return client.from("wallets").select("*");
};
