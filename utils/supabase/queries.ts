import { Filters } from "@/contexts/filter-context";
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

  // Filter by label_id if available
  if (params?.label_id) {
    query = query.eq("label_id", params.label_id);
  }

  // Filter by category_id if available
  if (params?.category_id) {
    query = query.eq("category_id", params.category_id);
  }

  // Filter by wallet_id if available
  if (params?.wallet_id) {
    query = query.eq("wallet_id", params.wallet_id);
  }

  return query;
};

export const listLabels = (client: TypedSupabaseClient) => {
  return client.from("labels").select("*");
};

export const listCategories = (client: TypedSupabaseClient) => {
  return client.from("categories").select("*");
};

export const listWallets = (client: TypedSupabaseClient) => {
  return client.from("wallets").select("*");
};
