import { SupabaseClient } from "@supabase/supabase-js";

import { TypedSupabaseClient } from "@/utils/supabase/types";

export interface Filters {
  label_id?: string | undefined;
  category_id?: string | undefined;
  to?: string | undefined;
  from?: string | undefined;
  wallet_id?: string | undefined;
  tag?: string | undefined;
  type?: string | undefined;
  transfer_id?: string | undefined;
  description?: string | undefined;
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

  // Filter by tag if available
  if (params?.tag) {
    query = query.contains("tags", [params.tag]);
  }

  // Filter by type if available
  if (params?.type) {
    query = query.eq("type", params.type);
  }

  // Filter by wallet_id if available
  if (params?.wallet_id) {
    query = query.eq("wallet_id", params.wallet_id);
  }

  // Filter by transfer_id if available
  if (params?.transfer_id) {
    query = query.eq("transfer_id", params.transfer_id);
  }

  // Filter by description if available
  if (params?.description) {
    query = query.ilike("description", `%${params.description}%`);
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

export const getTotalExpenses = async (
  client: TypedSupabaseClient,
  walletId: string,
) => {
  const { data, error } = await client
    .from("monthly_stats")
    .select("outcome_cents")
    .eq("wallet_id", walletId);

  if (error) {
    return { data: null, error } as const;
  }

  const totalExpenses = (data ?? []).reduce(
    (sum, month) => sum + Math.abs(month.outcome_cents ?? 0),
    0,
  );

  return { data: totalExpenses, error: null } as const;
};

// Monthly Category Stats Queries
export const getMonthlyCategoryStats = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    categoryId?: string;
    from?: string;
    to?: string;
    type?: "income" | "expense" | "net";
  },
) => {
  let query = client
    .from("monthly_category_stats")
    .select(
      `
      *,
      categories (
        id,
        name,
        icon,
        type
      )
    `,
    )
    .order("month", { ascending: true });

  if (params.walletId) {
    query = query.eq("wallet_id", params.walletId);
  }

  if (params.categoryId) {
    query = query.eq("category_id", params.categoryId);
  }

  if (params.from) {
    query = query.gte("month", params.from);
  }

  if (params.to) {
    query = query.lte("month", params.to);
  }

  // Filter by type if specified
  if (params.type) {
    if (params.type === "income") {
      query = query.gt("income_cents", 0);
    } else if (params.type === "expense") {
      query = query.lt("outcome_cents", 0);
    } else if (params.type === "net") {
      query = query.neq("net_cents", 0);
    }
  }

  return query;
};

// Monthly Label Stats Queries
export const getMonthlyLabelStats = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    labelId?: string;
    from?: string;
    to?: string;
    type?: "income" | "expense" | "net";
  },
) => {
  let query = client
    .from("monthly_label_stats")
    .select(
      `
      *,
      labels (
        id,
        name,
        color
      )
    `,
    )
    .order("month", { ascending: true });

  if (params.walletId) {
    query = query.eq("wallet_id", params.walletId);
  }

  if (params.labelId) {
    query = query.eq("label_id", params.labelId);
  }

  if (params.from) {
    query = query.gte("month", params.from);
  }

  if (params.to) {
    query = query.lte("month", params.to);
  }

  // Filter by type if specified
  if (params.type) {
    if (params.type === "income") {
      query = query.gt("income_cents", 0);
    } else if (params.type === "expense") {
      query = query.lt("outcome_cents", 0);
    } else if (params.type === "net") {
      query = query.neq("net_cents", 0);
    }
  }

  return query;
};

// Get category pie chart data for a specific month or date range
export const getCategoryPieChartData = async (
  client: TypedSupabaseClient,
  params: {
    walletId: string;
    from?: string;
    to?: string;
    type: "income" | "expense" | "net";
  },
) => {
  let query = client
    .from("monthly_category_stats")
    .select(
      `
      income_cents,
      outcome_cents,
      net_cents,
      transaction_count,
      categories (
        id,
        name,
        icon,
        type
      )
    `,
    )
    .eq("wallet_id", params.walletId);

  // Filter by date range if specified
  if (params.from) {
    query = query.gte("month", params.from);
  }
  if (params.to) {
    query = query.lte("month", params.to);
  }

  // Filter by type
  if (params.type === "income") {
    query = query.gt("income_cents", 0);
  } else if (params.type === "expense") {
    query = query.lt("outcome_cents", 0);
  } else if (params.type === "net") {
    query = query.neq("net_cents", 0);
  }

  return query.order("transaction_count", { ascending: false });
};

// Get label pie chart data for a specific month or date range
export const getLabelPieChartData = async (
  client: TypedSupabaseClient,
  params: {
    walletId: string;
    from?: string;
    to?: string;
    type: "income" | "expense" | "net";
  },
) => {
  let query = client
    .from("monthly_label_stats")
    .select(
      `
      income_cents,
      outcome_cents,
      net_cents,
      transaction_count,
      labels (
        id,
        name,
        color
      )
    `,
    )
    .eq("wallet_id", params.walletId);

  // Filter by date range if specified
  if (params.from) {
    query = query.gte("month", params.from);
  }
  if (params.to) {
    query = query.lte("month", params.to);
  }

  // Filter by type
  if (params.type === "income") {
    query = query.gt("income_cents", 0);
  } else if (params.type === "expense") {
    query = query.lt("outcome_cents", 0);
  } else if (params.type === "net") {
    query = query.neq("net_cents", 0);
  }

  return query.order("transaction_count", { ascending: false });
};

// Get category transaction counts (total across all months)
export const getCategoryTransactionCounts = async (
  client: TypedSupabaseClient,
  params?: {
    walletId?: string;
    type?: "income" | "expense";
  },
) => {
  // First get all categories of the specified type
  const { data: categories, error: categoriesError } = await client
    .from("categories")
    .select("id")
    .eq("type", params?.type || "expense");

  if (categoriesError) {
    return { data: null, error: categoriesError };
  }

  // Count transactions for each category
  const result = await Promise.all(
    categories.map(async (category) => {
      let query = client
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("category_id", category.id);

      if (params?.walletId) {
        query = query.eq("wallet_id", params.walletId);
      }

      // Don't filter by transaction type here since we already filtered by category type
      // This allows transfer transactions that use income/expense categories to be counted

      const { count, error } = await query;

      if (error) {
        console.error(
          `Error counting transactions for category ${category.id}:`,
          error,
        );
        return {
          category_id: category.id,
          transaction_count: 0,
        };
      }

      return {
        category_id: category.id,
        transaction_count: count || 0,
      };
    }),
  );

  return { data: result, error: null };
};
