import { TypedSupabaseClient } from "@/utils/supabase/types";

interface Params {
  from?: string;
  to?: string;
  category_id?: string;
  subject_id?: string;
}

export const listTransactions = (
  client: TypedSupabaseClient,
  params: Params,
) => {
  let query = client
    .from("transactions")
    .select("*", { count: "exact" })
    .order("date", { ascending: false });

  if (params.from && params.to) {
    query = query.gte("date", params.from).lte("date", params.to);
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
