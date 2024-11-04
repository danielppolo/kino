"use server";

import { TypedSupabaseClient } from "@/utils/supabase/types";

export interface Filters {
  label_id?: string | undefined;
  category_id?: string | undefined;
  to?: string | undefined;
  from?: string | undefined;
  wallet_id?: string | undefined;
}

export const listTransactions = async (
  client: TypedSupabaseClient,
  params?: Filters,
) => {
  let query = client
    .from("transaction_list")
    .select("*")
    .order("date", { ascending: false });

  // Date range filtering
  if (params?.from && params?.to) {
    query = query.gte("date", params.from).lte("date", params.to);
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

export const listLabels = async (client: TypedSupabaseClient) => {
  return client.from("labels").select("*");
};

export const listCategories = async (client: TypedSupabaseClient) => {
  return client.from("categories").select("*");
};

export const listWallets = async (client: TypedSupabaseClient) => {
  return client.from("wallets").select("*");
};
