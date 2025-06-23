import { SupabaseClient } from "@supabase/supabase-js";

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
  params?: Filters & { page?: number; pageSize?: number },
) => {
  let query = client
    .from("transaction_list")
    .select("*", { count: "exact" })
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

  const page = params?.page || 0;
  const pageSize = params?.pageSize || 50;

  const { data, error, count } = await query.range(
    page * pageSize,
    (page + 1) * pageSize - 1,
  );

  return { data, error, count };
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

export const listTags = async (client: TypedSupabaseClient) => {
  return client.from("tags").select("*");
};

export const getWalletMonthlyBalances = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  let query = client
    .from("wallet_monthly_balances")
    .select("*")
    .order("month", { ascending: true });

  if (params.walletId) {
    query = query.eq("wallet_id", params.walletId);
  }

  if (params.from) {
    query = query.gte("month", params.from);
  }
  if (params.to) {
    query = query.lte("month", params.to);
  }

  return query;
};

export async function getMonthlyStats(
  supabase: SupabaseClient,
  {
    walletId,
    from,
    to,
  }: {
    walletId?: string;
    from?: string;
    to?: string;
  } = {},
) {
  let query = supabase
    .from("monthly_stats")
    .select("*")
    .order("month", { ascending: true });

  if (walletId) {
    query = query.eq("wallet_id", walletId);
  }

  if (from) {
    query = query.gte("month", from);
  }

  if (to) {
    query = query.lte("month", to);
  }

  return query;
}
