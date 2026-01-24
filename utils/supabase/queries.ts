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
  id?: string | undefined;
  sort?: string | undefined;
  sortOrder?: string | undefined;
}

export const listTransactions = async (
  client: TypedSupabaseClient,
  params?: Filters & { page?: number; pageSize?: number },
) => {
  let query = client.from("transaction_list").select("*", { count: "exact" });

  // Apply sorting
  const sortField = params?.sort || "date";
  const sortOrder = params?.sortOrder || "desc";
  const ascending = sortOrder === "asc";

  query = query.order(sortField, { ascending });

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
    query = query.contains("tag_ids", [params.tag]);
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

  // Filter by id if available
  if (params?.id) {
    query = query.eq("id", params.id);
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

export const listViews = async (client: TypedSupabaseClient) => {
  return client.from("views").select("*");
};
export const listTransactionTemplates = async (client: TypedSupabaseClient) => {
  return client.from("transaction_templates").select("*");
};

type WalletMonthlyBalance = {
  balance_cents: number;
  created_at: string;
  id: string;
  month: string;
  updated_at: string;
  wallet_id: string;
};

export const getWalletMonthlyBalances = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const PAGE_SIZE = 1000;
  let allData: WalletMonthlyBalance[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = client
      .from("wallet_monthly_balances")
      .select("*")
      .order("month", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (params.walletId) {
      query = query.eq("wallet_id", params.walletId);
    }

    if (params.from) {
      query = query.gte("month", params.from);
    }
    if (params.to) {
      query = query.lte("month", params.to);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    if (data) {
      allData = [...allData, ...data];
    }

    hasMore = data?.length === PAGE_SIZE;
    page++;
  }

  return { data: allData, error: null };
};

type WalletMonthlyOwed = {
  id: string;
  wallet_id: string;
  month: string;
  owed_cents: number;
  created_at: string;
  updated_at: string;
};

export const getWalletMonthlyOwed = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const PAGE_SIZE = 1000;
  let allData: WalletMonthlyOwed[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = client
      .from("wallet_monthly_owed")
      .select("*")
      .order("month", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (params.walletId) {
      query = query.eq("wallet_id", params.walletId);
    }

    if (params.from) {
      query = query.gte("month", params.from);
    }
    if (params.to) {
      query = query.lte("month", params.to);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    if (data) {
      allData = [...allData, ...data];
    }

    hasMore = data?.length === PAGE_SIZE;
    page++;
  }

  return { data: allData, error: null };
};

export const getWalletOwed = async (
  client: TypedSupabaseClient,
  walletId: string,
) => {
  const { data: bills, error } = await listBillsWithPayments(client, {
    walletId,
  });

  if (error) {
    return { data: null, error };
  }

  const owedCents = (bills ?? []).reduce((sum, bill) => {
    const remaining = bill.amount_cents - bill.paid_amount_cents;
    return sum + Math.max(0, remaining); // No negative owed
  }, 0);

  return { data: owedCents, error: null };
};

type MonthlyStats = {
  created_at: string;
  id: string;
  income_cents: number;
  month: string;
  net_cents: number;
  outcome_cents: number;
  updated_at: string;
  wallet_id: string | null;
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
  const PAGE_SIZE = 1000;
  let allData: MonthlyStats[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from("monthly_stats")
      .select("*")
      .order("month", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (walletId) {
      query = query.eq("wallet_id", walletId);
    }

    if (from) {
      query = query.gte("month", from);
    }

    if (to) {
      query = query.lte("month", to);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    if (data) {
      allData = [...allData, ...data];
    }

    hasMore = data?.length === PAGE_SIZE;
    page++;
  }

  return { data: allData, error: null };
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
  const buildQuery = () => {
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

  const pageSize = 1000;
  let fromIndex = 0;
  let allData: any[] = [];

  while (true) {
    const { data, error } = await buildQuery().range(
      fromIndex,
      fromIndex + pageSize - 1,
    );

    if (error) {
      return { data: null, error } as const;
    }

    allData = allData.concat(data ?? []);

    if (!data || data.length < pageSize) {
      break;
    }

    fromIndex += pageSize;
  }

  return { data: allData, error: null } as const;
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
  const buildQuery = () => {
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

  const pageSize = 1000;
  let fromIndex = 0;
  let allData: any[] = [];

  while (true) {
    const { data, error } = await buildQuery().range(
      fromIndex,
      fromIndex + pageSize - 1,
    );

    if (error) {
      return { data: null, error } as const;
    }

    allData = allData.concat(data ?? []);

    if (!data || data.length < pageSize) {
      break;
    }

    fromIndex += pageSize;
  }

  return { data: allData, error: null } as const;
};

// Get category pie chart data for a specific month or date range
export const getCategoryPieChartData = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
    type: "income" | "expense" | "net";
  },
) => {
  let query = client.from("monthly_category_stats").select(
    `
      income_cents,
      outcome_cents,
      net_cents,
      transaction_count,
      wallet_id,
      categories (
        id,
        name,
        icon,
        type
      )
    `,
  );

  // Filter by wallet if specified
  if (params.walletId) {
    query = query.eq("wallet_id", params.walletId);
  }

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
    walletId?: string;
    from?: string;
    to?: string;
    type: "income" | "expense" | "net";
  },
) => {
  let query = client.from("monthly_label_stats").select(
    `
      income_cents,
      outcome_cents,
      net_cents,
      transaction_count,
      wallet_id,
      labels (
        id,
        name,
        color
      )
    `,
  );

  // Filter by wallet if specified
  if (params.walletId) {
    query = query.eq("wallet_id", params.walletId);
  }

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

// Get tag transaction counts (total across all months)
export const getTagTransactionCounts = async (
  client: TypedSupabaseClient,
  params?: {
    walletId?: string;
  },
) => {
  // First get all tags
  const { data: tags, error: tagsError } = await client
    .from("tags")
    .select("id");

  if (tagsError) {
    return { data: null, error: tagsError };
  }

  // Count transactions for each tag using the transaction_tags junction table
  const result = await Promise.all(
    tags.map(async (tag) => {
      let query = client
        .from("transaction_tags")
        .select("transaction_id", { count: "exact", head: true })
        .eq("tag_id", tag.id);

      // If walletId is specified, we need to join with transactions to filter by wallet
      if (params?.walletId) {
        query = client
          .from("transaction_tags")
          .select(
            `
            transaction_id,
            transactions!inner (
              wallet_id
            )
          `,
            { count: "exact", head: true },
          )
          .eq("tag_id", tag.id)
          .eq("transactions.wallet_id", params.walletId);
      }

      const { count, error } = await query;

      if (error) {
        console.error(`Error counting transactions for tag ${tag.id}:`, error);
        return {
          tag_id: tag.id,
          transaction_count: 0,
        };
      }

      return {
        tag_id: tag.id,
        transaction_count: count || 0,
      };
    }),
  );

  return { data: result, error: null };
};

export const listRecurringTransactions = async (
  client: TypedSupabaseClient,
  params?: { walletId?: string; type?: "income" | "expense" },
) => {
  let query = client
    .from("recurring_transactions")
    .select(
      `
      *,
      categories (
        id,
        name,
        type,
        icon
      )
    `,
    )
    .order("start_date", { ascending: false });

  if (params?.walletId) {
    query = query.eq("wallet_id", params.walletId);
  }

  if (params?.type) {
    query = query.eq("type", params.type);
  }

  const { data, error } = await query;
  return { data, error };
};

export const getTransactionTotalBase = async (
  client: TypedSupabaseClient,
  params?: Filters,
) => {
  const { data, error } = await (client as any).rpc("get_transaction_total", {
    p_wallet_id: params?.wallet_id || null,
    p_from_date: params?.from || null,
    p_to_date: params?.to || null,
    p_label_id: params?.label_id || null,
    p_category_id: params?.category_id || null,
    p_tag: params?.tag || null,
    p_type: params?.type || null,
    p_transfer_id: params?.transfer_id || null,
    p_description: params?.description || null,
    p_id: params?.id || null,
  });

  if (error) {
    return { data: null, error } as const;
  }

  return { data: data as number, error: null } as const;
};

export const getCashflowBreakdown = async (
  client: TypedSupabaseClient,
  params?: Filters,
) => {
  const { data, error } = await (client as any).rpc("get_cashflow_breakdown", {
    p_wallet_id: params?.wallet_id || null,
    p_from_date: params?.from || null,
    p_to_date: params?.to || null,
    p_label_id: params?.label_id || null,
    p_category_id: params?.category_id || null,
    p_tag: params?.tag || null,
    p_type: params?.type || null,
    p_transfer_id: params?.transfer_id || null,
    p_description: params?.description || null,
    p_id: params?.id || null,
  });

  if (error) {
    return { data: null, error } as const;
  }

  return {
    data: data?.[0] || {
      total_cashflow: 0,
      total_expenses: 0,
      total_incomes: 0,
    },
    error: null,
  } as const;
};

// Bills queries
export const listBills = async (
  client: TypedSupabaseClient,
  params?: { walletId?: string },
) => {
  let query = client
    .from("bills")
    .select("*")
    .order("due_date", { ascending: true });

  if (params?.walletId) {
    query = query.eq("wallet_id", params.walletId);
  }

  return query;
};

export const getBillWithPayments = async (
  client: TypedSupabaseClient,
  billId: string,
) => {
  // Get the bill
  const { data: bill, error: billError } = await client
    .from("bills")
    .select("*")
    .eq("id", billId)
    .single();

  if (billError) {
    return { data: null, error: billError };
  }

  // Get the payments with transaction details
  const { data: payments, error: paymentsError } = await client
    .from("bill_payments")
    .select(
      `
      id,
      transaction_id,
      transactions:transaction_id (
        id,
        wallet_id,
        category_id,
        label_id,
        amount_cents,
        currency,
        description,
        date,
        type
      )
    `,
    )
    .eq("bill_id", billId);

  if (paymentsError) {
    return { data: null, error: paymentsError };
  }

  // Calculate paid amount (sum of absolute values of expense transactions)
  const paidAmountCents = (payments ?? []).reduce((sum, payment) => {
    const transaction = payment.transactions as any;
    if (transaction) {
      return sum + Math.abs(transaction.amount_cents || 0);
    }
    return sum;
  }, 0);

  const paymentPercentage =
    bill.amount_cents > 0
      ? Math.min(100, Math.round((paidAmountCents / bill.amount_cents) * 100))
      : 0;

  return {
    data: {
      ...bill,
      payments: (payments ?? []).map((p) => ({
        id: p.id,
        transaction: p.transactions,
      })),
      paid_amount_cents: paidAmountCents,
      payment_percentage: paymentPercentage,
    },
    error: null,
  };
};

export const listBillsWithPayments = async (
  client: TypedSupabaseClient,
  params?: { walletId?: string },
) => {
  // Get all bills
  let billsQuery = client
    .from("bills")
    .select("*")
    .order("due_date", { ascending: true });

  if (params?.walletId) {
    billsQuery = billsQuery.eq("wallet_id", params.walletId);
  }

  const { data: bills, error: billsError } = await billsQuery;

  if (billsError) {
    return { data: null, error: billsError };
  }

  if (!bills || bills.length === 0) {
    return { data: [], error: null };
  }

  // Get all payments for these bills
  const billIds = bills.map((b) => b.id);
  const { data: payments, error: paymentsError } = await client
    .from("bill_payments")
    .select(
      `
      id,
      bill_id,
      transaction_id,
      transactions:transaction_id (
        id,
        wallet_id,
        category_id,
        label_id,
        amount_cents,
        currency,
        description,
        date,
        type
      )
    `,
    )
    .in("bill_id", billIds);

  if (paymentsError) {
    return { data: null, error: paymentsError };
  }

  // Group payments by bill_id
  const paymentsByBill = (payments ?? []).reduce(
    (acc, payment) => {
      if (!acc[payment.bill_id]) {
        acc[payment.bill_id] = [];
      }
      acc[payment.bill_id].push(payment);
      return acc;
    },
    {} as Record<string, typeof payments>,
  );

  // Build result with payment info
  const result = bills.map((bill) => {
    const billPayments = paymentsByBill[bill.id] ?? [];
    const paidAmountCents = billPayments.reduce((sum, payment) => {
      const transaction = payment.transactions as any;
      if (transaction) {
        return sum + Math.abs(transaction.amount_cents || 0);
      }
      return sum;
    }, 0);

    const paymentPercentage =
      bill.amount_cents > 0
        ? Math.min(100, Math.round((paidAmountCents / bill.amount_cents) * 100))
        : 0;

    return {
      ...bill,
      payments: billPayments.map((p) => ({
        id: p.id,
        transaction: p.transactions,
      })),
      paid_amount_cents: paidAmountCents,
      payment_percentage: paymentPercentage,
    };
  });

  return { data: result, error: null };
};

export const getBillsForTransaction = async (
  client: TypedSupabaseClient,
  transactionId: string,
) => {
  const { data, error } = await client
    .from("bill_payments")
    .select(
      `
      id,
      bill_id,
      bills:bill_id (
        id,
        wallet_id,
        description,
        amount_cents,
        currency,
        due_date
      )
    `,
    )
    .eq("transaction_id", transactionId);

  if (error) {
    return { data: null, error };
  }

  return {
    data: (data ?? []).map((p) => p.bills).filter(Boolean),
    error: null,
  };
};

export const getWalletMembers = async (
  client: TypedSupabaseClient,
  walletId: string,
) => {
  const { data, error } = await client.rpc("get_wallet_members", {
    wallet_uuid: walletId,
  });

  return { data, error };
};
