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
  min_amount?: string | undefined;
  max_amount?: string | undefined;
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

  // Filter by min_amount if available (convert to cents)
  if (params?.min_amount) {
    const minAmountCents = Math.round(parseFloat(params.min_amount) * 100);
    if (!isNaN(minAmountCents)) {
      query = query.gte("amount_cents", minAmountCents);
    }
  }

  // Filter by max_amount if available (convert to cents)
  if (params?.max_amount) {
    const maxAmountCents = Math.round(parseFloat(params.max_amount) * 100);
    if (!isNaN(maxAmountCents)) {
      query = query.lte("amount_cents", maxAmountCents);
    }
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

  console.log("totalExpenses", totalExpenses);

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
    .order("due_date", { ascending: false });

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

export const getAllWalletMembers = async (
  client: TypedSupabaseClient,
  walletIds: string[],
) => {
  const { data, error } = await client.rpc("get_all_wallet_members", {
    wallet_uuids: walletIds,
  });

  return { data, error };
};

export const getUnassociatedTransactions = async (
  client: TypedSupabaseClient,
  params: { walletId: string; billCurrency: string },
) => {
  // Get all transaction IDs that are already associated with bills
  const { data: associatedIds, error: idsError } = await client
    .from("bill_payments")
    .select("transaction_id");

  if (idsError) {
    return { data: null, error: idsError };
  }

  const associatedSet = new Set(
    associatedIds?.map((p) => p.transaction_id) ?? [],
  );

  // Get all income transactions for the wallet
  const { data: transactions, error } = await client
    .from("transaction_list")
    .select("*")
    .eq("wallet_id", params.walletId)
    .eq("currency", params.billCurrency)
    .eq("type", "income")
    .order("date", { ascending: false });

  if (error) {
    return { data: null, error };
  }

  // Filter out transactions that are already associated with bills
  const unassociated =
    transactions?.filter((t) => !associatedSet.has(t.id!)) ?? [];

  return { data: unassociated, error: null };
};

export interface MonthlyBillStats {
  month: string;
  wallet_id: string;
  total_bills_cents: number;
  total_paid_cents: number;
  total_outstanding_cents: number;
  bill_count: number;
}

export const getMonthlyBillStats = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  // Get all bills with payments
  const { data: bills, error } = await listBillsWithPayments(client, {
    walletId: params.walletId,
  });

  if (error || !bills) {
    return { data: null, error };
  }

  // Group bills by month (using due_date)
  const monthlyStats: Record<string, MonthlyBillStats> = {};

  bills.forEach((bill) => {
    // Get the month from due_date (format: YYYY-MM-01)
    const dueDate = new Date(bill.due_date);
    const month = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-01`;

    // Apply date filters
    if (params.from && month < params.from) return;
    if (params.to && month > params.to) return;

    const key = `${bill.wallet_id}-${month}`;

    if (!monthlyStats[key]) {
      monthlyStats[key] = {
        month,
        wallet_id: bill.wallet_id,
        total_bills_cents: 0,
        total_paid_cents: 0,
        total_outstanding_cents: 0,
        bill_count: 0,
      };
    }

    monthlyStats[key].total_bills_cents += bill.amount_cents;
    monthlyStats[key].total_paid_cents += bill.paid_amount_cents;
    monthlyStats[key].total_outstanding_cents += Math.max(
      0,
      bill.amount_cents - bill.paid_amount_cents,
    );
    monthlyStats[key].bill_count += 1;
  });

  // Convert to array and sort by month
  const result = Object.values(monthlyStats).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  return { data: result, error: null };
};

export interface BillDebtFlowData {
  month: string; // YYYY-MM-01 format
  wallet_id: string;
  debt_increase_cents: number; // Bills created this month (by created_at)
  debt_decrease_cents: number; // Payments made this month (by transaction.date)
  net_change_cents: number; // increase - decrease
}

export const getBillDebtFlow = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  // Get all bills with payments
  const { data: bills, error } = await listBillsWithPayments(client, {
    walletId: params.walletId,
  });

  if (error || !bills) {
    return { data: null, error };
  }

  // Track monthly increases (when bills are created) and decreases (when payments are made)
  const monthlyIncreases: Record<string, Record<string, number>> = {};
  const monthlyDecreases: Record<string, Record<string, number>> = {};

  // Group debt increases by created_at month
  bills.forEach((bill) => {
    const createdDate = new Date(bill.created_at);
    const month = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}-01`;

    // Apply date filters
    if (params.from && month < params.from) return;
    if (params.to && month > params.to) return;

    if (!monthlyIncreases[month]) {
      monthlyIncreases[month] = {};
    }

    if (!monthlyIncreases[month][bill.wallet_id]) {
      monthlyIncreases[month][bill.wallet_id] = 0;
    }

    monthlyIncreases[month][bill.wallet_id] += bill.amount_cents;
  });

  // Group debt decreases by transaction.date month
  bills.forEach((bill) => {
    bill.payments.forEach((payment) => {
      if (!payment.transaction) return;

      const paymentDate = new Date(payment.transaction.date);
      const month = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}-01`;

      // Apply date filters
      if (params.from && month < params.from) return;
      if (params.to && month > params.to) return;

      if (!monthlyDecreases[month]) {
        monthlyDecreases[month] = {};
      }

      if (!monthlyDecreases[month][bill.wallet_id]) {
        monthlyDecreases[month][bill.wallet_id] = 0;
      }

      monthlyDecreases[month][bill.wallet_id] += Math.abs(
        payment.transaction.amount_cents,
      );
    });
  });

  // Combine increases and decreases into unified monthly data
  const allMonths = new Set([
    ...Object.keys(monthlyIncreases),
    ...Object.keys(monthlyDecreases),
  ]);

  const result: BillDebtFlowData[] = [];

  allMonths.forEach((month) => {
    const walletIds = new Set([
      ...Object.keys(monthlyIncreases[month] || {}),
      ...Object.keys(monthlyDecreases[month] || {}),
    ]);

    walletIds.forEach((walletId) => {
      const increase = monthlyIncreases[month]?.[walletId] || 0;
      const decrease = monthlyDecreases[month]?.[walletId] || 0;

      result.push({
        month,
        wallet_id: walletId,
        debt_increase_cents: increase,
        debt_decrease_cents: decrease,
        net_change_cents: increase - decrease,
      });
    });
  });

  // Sort by month
  result.sort((a, b) => a.month.localeCompare(b.month));

  return { data: result, error: null };
};

export interface BillPaymentTimelineData {
  month: string;
  wallet_id: string;
  avg_days_from_due: number;
  on_time_count: number;
  late_count: number;
  total_count: number;
}

export const getBillPaymentTimeline = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const { data: bills, error } = await listBillsWithPayments(client, {
    walletId: params.walletId,
  });

  if (error || !bills) {
    return { data: null, error };
  }

  // Only include bills that have at least one payment
  const paidBills = bills.filter(
    (bill) => bill.payments && bill.payments.length > 0,
  );

  const monthlyData: Record<string, BillPaymentTimelineData> = {};

  paidBills.forEach((bill) => {
    // Get the first payment date (assuming first payment is what we track)
    const firstPayment = bill.payments[0];
    if (!firstPayment?.transaction) return;

    const dueDate = new Date(bill.due_date);
    const paymentDate = new Date(firstPayment.transaction.date);
    const month = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-01`;

    // Apply date filters
    if (params.from && month < params.from) return;
    if (params.to && month > params.to) return;

    // Calculate days difference (negative = early, positive = late)
    const daysFromDue = Math.round(
      (paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const key = `${bill.wallet_id}-${month}`;

    if (!monthlyData[key]) {
      monthlyData[key] = {
        month,
        wallet_id: bill.wallet_id,
        avg_days_from_due: 0,
        on_time_count: 0,
        late_count: 0,
        total_count: 0,
      };
    }

    monthlyData[key].avg_days_from_due += daysFromDue;
    monthlyData[key].total_count += 1;

    if (daysFromDue <= 0) {
      monthlyData[key].on_time_count += 1;
    } else {
      monthlyData[key].late_count += 1;
    }
  });

  // Calculate averages
  const result = Object.values(monthlyData)
    .map((data) => ({
      ...data,
      avg_days_from_due:
        data.total_count > 0 ? data.avg_days_from_due / data.total_count : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { data: result, error: null };
};

export interface RecurringVsOneTimeData {
  month: string;
  wallet_id: string;
  recurring_bills_cents: number;
  one_time_bills_cents: number;
  recurring_count: number;
  one_time_count: number;
}

export const getRecurringVsOneTimeStats = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const { data: bills, error } = await listBillsWithPayments(client, {
    walletId: params.walletId,
  });

  if (error || !bills) {
    return { data: null, error };
  }

  const monthlyData: Record<string, RecurringVsOneTimeData> = {};

  bills.forEach((bill) => {
    const dueDate = new Date(bill.due_date);
    const month = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-01`;

    // Apply date filters
    if (params.from && month < params.from) return;
    if (params.to && month > params.to) return;

    const key = `${bill.wallet_id}-${month}`;

    if (!monthlyData[key]) {
      monthlyData[key] = {
        month,
        wallet_id: bill.wallet_id,
        recurring_bills_cents: 0,
        one_time_bills_cents: 0,
        recurring_count: 0,
        one_time_count: 0,
      };
    }

    if (bill.is_recurring) {
      monthlyData[key].recurring_bills_cents += bill.amount_cents;
      monthlyData[key].recurring_count += 1;
    } else {
      monthlyData[key].one_time_bills_cents += bill.amount_cents;
      monthlyData[key].one_time_count += 1;
    }
  });

  const result = Object.values(monthlyData).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  return { data: result, error: null };
};

export interface TransactionTypeData {
  month: string;
  wallet_id: string;
  income_cents: number;
  expense_cents: number;
  transfer_cents: number;
}

export const getTransactionTypeDistribution = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMore = true;
  let allTransactions: any[] = [];

  while (hasMore) {
    let query = client
      .from("transaction_list")
      .select("*")
      .order("date", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (params.walletId) {
      query = query.eq("wallet_id", params.walletId);
    }

    if (params.from) {
      query = query.gte("date", params.from);
    }

    if (params.to) {
      query = query.lte("date", params.to);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    if (data) {
      allTransactions = [...allTransactions, ...data];
    }

    hasMore = data?.length === PAGE_SIZE;
    page++;
  }

  const monthlyData: Record<string, TransactionTypeData> = {};

  allTransactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;

    const key = `${transaction.wallet_id}-${month}`;

    if (!monthlyData[key]) {
      monthlyData[key] = {
        month,
        wallet_id: transaction.wallet_id,
        income_cents: 0,
        expense_cents: 0,
        transfer_cents: 0,
      };
    }

    if (transaction.type === "income") {
      monthlyData[key].income_cents += Math.abs(transaction.amount_cents);
    } else if (transaction.type === "expense") {
      monthlyData[key].expense_cents += Math.abs(transaction.amount_cents);
    } else if (transaction.type === "transfer") {
      monthlyData[key].transfer_cents += Math.abs(transaction.amount_cents);
    }
  });

  const result = Object.values(monthlyData).sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  return { data: result, error: null };
};

export interface BillVelocityData {
  month: string;
  wallet_id: string;
  avg_days_to_pay: number;
  bill_count: number;
}

export const getBillVelocity = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const { data: bills, error } = await listBillsWithPayments(client, {
    walletId: params.walletId,
  });

  if (error || !bills) {
    return { data: null, error };
  }

  const paidBills = bills.filter(
    (bill) => bill.payments && bill.payments.length > 0,
  );

  const monthlyData: Record<string, BillVelocityData> = {};

  paidBills.forEach((bill) => {
    const firstPayment = bill.payments[0];
    if (!firstPayment?.transaction) return;

    const dueDate = new Date(bill.due_date);
    const paymentDate = new Date(firstPayment.transaction.date);
    const month = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-01`;

    if (params.from && month < params.from) return;
    if (params.to && month > params.to) return;

    const daysToPayAfterDue = Math.max(
      0,
      Math.round(
        (paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    const key = `${bill.wallet_id}-${month}`;

    if (!monthlyData[key]) {
      monthlyData[key] = {
        month,
        wallet_id: bill.wallet_id,
        avg_days_to_pay: 0,
        bill_count: 0,
      };
    }

    monthlyData[key].avg_days_to_pay += daysToPayAfterDue;
    monthlyData[key].bill_count += 1;
  });

  const result = Object.values(monthlyData)
    .map((data) => ({
      ...data,
      avg_days_to_pay:
        data.bill_count > 0 ? data.avg_days_to_pay / data.bill_count : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { data: result, error: null };
};

export interface BillCoverageData {
  wallet_id: string;
  wallet_name: string;
  current_balance_cents: number;
  upcoming_bills_30_days_cents: number;
  upcoming_bills_60_days_cents: number;
  upcoming_bills_90_days_cents: number;
  coverage_ratio_30: number;
  coverage_ratio_60: number;
  coverage_ratio_90: number;
}

export const getBillCoverageRatio = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
  },
) => {
  const { data: wallets, error: walletsError } = await client
    .from("wallets")
    .select("id, name, balance_cents");

  if (walletsError || !wallets) {
    return { data: null, error: walletsError };
  }

  const filteredWallets = params.walletId
    ? wallets.filter((w) => w.id === params.walletId)
    : wallets;

  const { data: bills, error: billsError } = await listBillsWithPayments(
    client,
    {
      walletId: params.walletId,
    },
  );

  if (billsError || !bills) {
    return { data: null, error: billsError };
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const result: BillCoverageData[] = filteredWallets.map((wallet) => {
    const walletBills = bills.filter((b) => b.wallet_id === wallet.id);

    const upcoming30 = walletBills
      .filter((b) => {
        const dueDate = new Date(b.due_date);
        return dueDate > now && dueDate <= thirtyDaysFromNow;
      })
      .reduce(
        (sum, b) => sum + Math.max(0, b.amount_cents - b.paid_amount_cents),
        0,
      );

    const upcoming60 = walletBills
      .filter((b) => {
        const dueDate = new Date(b.due_date);
        return dueDate > now && dueDate <= sixtyDaysFromNow;
      })
      .reduce(
        (sum, b) => sum + Math.max(0, b.amount_cents - b.paid_amount_cents),
        0,
      );

    const upcoming90 = walletBills
      .filter((b) => {
        const dueDate = new Date(b.due_date);
        return dueDate > now && dueDate <= ninetyDaysFromNow;
      })
      .reduce(
        (sum, b) => sum + Math.max(0, b.amount_cents - b.paid_amount_cents),
        0,
      );

    const balanceCents = wallet.balance_cents ?? 0;

    return {
      wallet_id: wallet.id,
      wallet_name: wallet.name,
      current_balance_cents: balanceCents,
      upcoming_bills_30_days_cents: upcoming30,
      upcoming_bills_60_days_cents: upcoming60,
      upcoming_bills_90_days_cents: upcoming90,
      coverage_ratio_30:
        upcoming30 > 0 ? balanceCents / upcoming30 : balanceCents > 0 ? 999 : 0,
      coverage_ratio_60:
        upcoming60 > 0 ? balanceCents / upcoming60 : balanceCents > 0 ? 999 : 0,
      coverage_ratio_90:
        upcoming90 > 0 ? balanceCents / upcoming90 : balanceCents > 0 ? 999 : 0,
    };
  });

  return { data: result, error: null };
};

export interface CategoryTrendData {
  month: string;
  wallet_id: string;
  category_id: string;
  category_name: string;
  amount_cents: number;
}

export const getCategoryTrends = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
    type?: "income" | "expense";
  },
) => {
  const stats = await getMonthlyCategoryStats(client, {
    walletId: params.walletId,
    from: params.from,
    to: params.to,
    type: params.type,
  });

  if (stats.error || !stats.data) {
    return { data: null, error: stats.error };
  }

  const result: CategoryTrendData[] = stats.data
    .filter((stat) => stat.categories)
    .map((stat) => ({
      month: stat.month,
      wallet_id: stat.wallet_id,
      category_id: stat.category_id,
      category_name: stat.categories?.name || "Unknown",
      amount_cents:
        params.type === "income"
          ? stat.income_cents
          : params.type === "expense"
            ? Math.abs(stat.outcome_cents)
            : Math.abs(stat.net_cents),
    }));

  return { data: result, error: null };
};

export interface TagCloudData {
  tag: string;
  count: number;
  total_amount_cents: number;
}

export const getTagCloudAnalytics = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMore = true;
  let allTransactions: any[] = [];

  while (hasMore) {
    let query = client
      .from("transaction_list")
      .select("*")
      .order("date", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (params.walletId) {
      query = query.eq("wallet_id", params.walletId);
    }

    if (params.from) {
      query = query.gte("date", params.from);
    }

    if (params.to) {
      query = query.lte("date", params.to);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    if (data) {
      allTransactions = [...allTransactions, ...data];
    }

    hasMore = data?.length === PAGE_SIZE;
    page++;
  }

  const tagStats: Record<string, TagCloudData> = {};

  allTransactions.forEach((transaction) => {
    if (!transaction.tag_ids || !Array.isArray(transaction.tag_ids)) return;

    transaction.tag_ids.forEach((tag: string) => {
      if (!tagStats[tag]) {
        tagStats[tag] = {
          tag,
          count: 0,
          total_amount_cents: 0,
        };
      }

      tagStats[tag].count += 1;
      tagStats[tag].total_amount_cents += Math.abs(transaction.amount_cents);
    });
  });

  const result = Object.values(tagStats).sort((a, b) => b.count - a.count);

  return { data: result, error: null };
};

export interface TransactionSizeData {
  range: string;
  count: number;
  total_amount_cents: number;
}

export const getTransactionSizeDistribution = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
    type?: "income" | "expense";
  },
) => {
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMore = true;
  let allTransactions: any[] = [];

  while (hasMore) {
    let query = client
      .from("transaction_list")
      .select("*")
      .order("date", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (params.walletId) {
      query = query.eq("wallet_id", params.walletId);
    }

    if (params.from) {
      query = query.gte("date", params.from);
    }

    if (params.to) {
      query = query.lte("date", params.to);
    }

    if (params.type) {
      query = query.eq("type", params.type);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    if (data) {
      allTransactions = [...allTransactions, ...data];
    }

    hasMore = data?.length === PAGE_SIZE;
    page++;
  }

  const ranges = [
    { min: 0, max: 1000, label: "$0-$10" },
    { min: 1000, max: 5000, label: "$10-$50" },
    { min: 5000, max: 10000, label: "$50-$100" },
    { min: 10000, max: 50000, label: "$100-$500" },
    { min: 50000, max: 100000, label: "$500-$1000" },
    { min: 100000, max: Infinity, label: "$1000+" },
  ];

  const distribution: Record<string, TransactionSizeData> = {};

  ranges.forEach((range) => {
    distribution[range.label] = {
      range: range.label,
      count: 0,
      total_amount_cents: 0,
    };
  });

  allTransactions.forEach((transaction) => {
    const amount = Math.abs(transaction.amount_cents);

    for (const range of ranges) {
      if (amount >= range.min && amount < range.max) {
        distribution[range.label].count += 1;
        distribution[range.label].total_amount_cents += amount;
        break;
      }
    }
  });

  const result = Object.values(distribution);

  return { data: result, error: null };
};

export interface CurrencyExposureData {
  currency: string;
  transaction_count: number;
  total_amount_cents: number;
}

export const getCurrencyExposure = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMore = true;
  let allTransactions: any[] = [];

  while (hasMore) {
    let query = client
      .from("transaction_list")
      .select("*")
      .order("date", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (params.walletId) {
      query = query.eq("wallet_id", params.walletId);
    }

    if (params.from) {
      query = query.gte("date", params.from);
    }

    if (params.to) {
      query = query.lte("date", params.to);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    if (data) {
      allTransactions = [...allTransactions, ...data];
    }

    hasMore = data?.length === PAGE_SIZE;
    page++;
  }

  const currencyStats: Record<string, CurrencyExposureData> = {};

  allTransactions.forEach((transaction) => {
    const currency = transaction.currency || "USD";

    if (!currencyStats[currency]) {
      currencyStats[currency] = {
        currency,
        transaction_count: 0,
        total_amount_cents: 0,
      };
    }

    currencyStats[currency].transaction_count += 1;
    currencyStats[currency].total_amount_cents += Math.abs(
      transaction.amount_cents,
    );
  });

  const result = Object.values(currencyStats).sort(
    (a, b) => b.total_amount_cents - a.total_amount_cents,
  );

  return { data: result, error: null };
};

export interface BillsBurdenData {
  month: string;
  wallet_id: string;
  total_bills_cents: number;
  total_income_cents: number;
  burden_ratio: number;
}

export const getBillBurdenRatio = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const { data: billStats, error: billError } = await getMonthlyBillStats(
    client,
    params,
  );

  if (billError || !billStats) {
    return { data: null, error: billError };
  }

  const { data: monthlyStats, error: statsError } = await getMonthlyStats(
    client,
    params,
  );

  if (statsError || !monthlyStats) {
    return { data: null, error: statsError };
  }

  const result: BillsBurdenData[] = billStats.map((bill) => {
    const stat = monthlyStats.find(
      (s) => s.month === bill.month && s.wallet_id === bill.wallet_id,
    );

    const totalIncome = stat ? stat.income_cents : 0;
    const burdenRatio =
      totalIncome > 0 ? (bill.total_bills_cents / totalIncome) * 100 : 0;

    return {
      month: bill.month,
      wallet_id: bill.wallet_id,
      total_bills_cents: bill.total_bills_cents,
      total_income_cents: totalIncome,
      burden_ratio: burdenRatio,
    };
  });

  return { data: result, error: null };
};

export interface ExpenseConcentrationData {
  category_id: string;
  category_name: string;
  total_cents: number;
  percentage: number;
}

export const getExpenseConcentration = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
    topN?: number;
  },
) => {
  const stats = await getMonthlyCategoryStats(client, {
    walletId: params.walletId,
    from: params.from,
    to: params.to,
    type: "expense",
  });

  if (stats.error || !stats.data) {
    return { data: null, error: stats.error };
  }

  const categoryTotals: Record<string, { name: string; total: number }> = {};

  stats.data.forEach((stat) => {
    if (!stat.categories) return;

    if (!categoryTotals[stat.category_id]) {
      categoryTotals[stat.category_id] = {
        name: stat.categories.name || "Unknown",
        total: 0,
      };
    }

    categoryTotals[stat.category_id].total += Math.abs(stat.outcome_cents);
  });

  const totalExpenses = Object.values(categoryTotals).reduce(
    (sum, cat) => sum + cat.total,
    0,
  );

  const sorted = Object.entries(categoryTotals)
    .map(([id, data]) => ({
      category_id: id,
      category_name: data.name,
      total_cents: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total_cents - a.total_cents);

  const topN = params.topN || 5;
  const topCategories = sorted.slice(0, topN);
  const otherCategories = sorted.slice(topN);

  const result = [...topCategories];

  if (otherCategories.length > 0) {
    const otherTotal = otherCategories.reduce(
      (sum, cat) => sum + cat.total_cents,
      0,
    );
    result.push({
      category_id: "other",
      category_name: "Other",
      total_cents: otherTotal,
      percentage: totalExpenses > 0 ? (otherTotal / totalExpenses) * 100 : 0,
    });
  }

  return { data: result, error: null };
};

export interface BillsVsDiscretionaryData {
  month: string;
  wallet_id: string;
  bill_expenses_cents: number;
  discretionary_expenses_cents: number;
}

export const getBillsVsDiscretionarySpending = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const { data: billStats, error: billError } = await getMonthlyBillStats(
    client,
    params,
  );

  if (billError || !billStats) {
    return { data: null, error: billError };
  }

  const { data: monthlyStats, error: statsError } = await getMonthlyStats(
    client,
    params,
  );

  if (statsError || !monthlyStats) {
    return { data: null, error: statsError };
  }

  const result: BillsVsDiscretionaryData[] = monthlyStats.map((stat) => {
    const bill = billStats.find(
      (b) => b.month === stat.month && b.wallet_id === stat.wallet_id,
    );

    const billExpenses = bill ? bill.total_paid_cents : 0;
    const totalExpenses = Math.abs(stat.outcome_cents);
    const discretionaryExpenses = Math.max(0, totalExpenses - billExpenses);

    return {
      month: stat.month,
      wallet_id: stat.wallet_id,
      bill_expenses_cents: billExpenses,
      discretionary_expenses_cents: discretionaryExpenses,
    };
  });

  return { data: result, error: null };
};

export interface CashFlowAfterBillsData {
  month: string;
  wallet_id: string;
  income_cents: number;
  bills_cents: number;
  other_expenses_cents: number;
  net_after_bills_cents: number;
}

export const getCashFlowAfterBills = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const { data: billStats, error: billError } = await getMonthlyBillStats(
    client,
    params,
  );

  if (billError || !billStats) {
    return { data: null, error: billError };
  }

  const { data: monthlyStats, error: statsError } = await getMonthlyStats(
    client,
    params,
  );

  if (statsError || !monthlyStats) {
    return { data: null, error: statsError };
  }

  const result: CashFlowAfterBillsData[] = monthlyStats.map((stat) => {
    const bill = billStats.find(
      (b) => b.month === stat.month && b.wallet_id === stat.wallet_id,
    );

    const billExpenses = bill ? bill.total_paid_cents : 0;
    const totalExpenses = Math.abs(stat.outcome_cents);
    const otherExpenses = Math.max(0, totalExpenses - billExpenses);
    const income = stat.income_cents;
    const netAfterBills = income - billExpenses - otherExpenses;

    return {
      month: stat.month,
      wallet_id: stat.wallet_id,
      income_cents: income,
      bills_cents: billExpenses,
      other_expenses_cents: otherExpenses,
      net_after_bills_cents: netAfterBills,
    };
  });

  return { data: result, error: null };
};

export interface ExpensePredictabilityData {
  month: string;
  wallet_id: string;
  bill_expenses_cents: number;
  discretionary_expenses_cents: number;
  predictability_score: number;
}

export const getExpensePredictability = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const { data: billsVsDiscretionary, error } =
    await getBillsVsDiscretionarySpending(client, params);

  if (error || !billsVsDiscretionary) {
    return { data: null, error };
  }

  const walletGroups: Record<string, number[]> = {};

  billsVsDiscretionary.forEach((stat) => {
    if (!walletGroups[stat.wallet_id]) {
      walletGroups[stat.wallet_id] = [];
    }
    walletGroups[stat.wallet_id].push(stat.discretionary_expenses_cents);
  });

  const result: ExpensePredictabilityData[] = billsVsDiscretionary.map(
    (stat, index, arr) => {
      const discretionaryExpenses = walletGroups[stat.wallet_id] || [];

      if (discretionaryExpenses.length < 2) {
        return {
          ...stat,
          predictability_score: 100,
        };
      }

      const mean =
        discretionaryExpenses.reduce((a, b) => a + b, 0) /
        discretionaryExpenses.length;
      const variance =
        discretionaryExpenses.reduce(
          (sum, val) => sum + Math.pow(val - mean, 2),
          0,
        ) / discretionaryExpenses.length;
      const stdDev = Math.sqrt(variance);

      const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;
      const predictabilityScore = Math.max(0, 100 - coefficientOfVariation);

      return {
        ...stat,
        predictability_score: predictabilityScore,
      };
    },
  );

  return { data: result, error: null };
};

export interface TransferFlowData {
  from_wallet_id: string;
  to_wallet_id: string;
  from_wallet_name: string;
  to_wallet_name: string;
  total_amount_cents: number;
  transfer_count: number;
}

export const getTransferFlowData = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMore = true;
  let allTransfers: any[] = [];

  while (hasMore) {
    let query = client
      .from("transaction_list")
      .select("*")
      .eq("type", "transfer")
      .not("transfer_id", "is", null)
      .order("date", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (params.walletId) {
      query = query.eq("wallet_id", params.walletId);
    }

    if (params.from) {
      query = query.gte("date", params.from);
    }

    if (params.to) {
      query = query.lte("date", params.to);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    if (data) {
      allTransfers = [...allTransfers, ...data];
    }

    hasMore = data?.length === PAGE_SIZE;
    page++;
  }

  const { data: wallets, error: walletsError } = await client
    .from("wallets")
    .select("id, name");

  if (walletsError || !wallets) {
    return { data: null, error: walletsError };
  }

  const walletMap = new Map(wallets.map((w) => [w.id, w.name]));

  const transferGroups: Record<
    string,
    {
      from_wallet_id: string;
      to_wallet_id: string;
      total_amount_cents: number;
      transfer_count: number;
    }
  > = {};

  const processedTransfers = new Set<string>();

  allTransfers.forEach((transfer) => {
    if (processedTransfers.has(transfer.transfer_id)) return;

    const relatedTransfer = allTransfers.find(
      (t) => t.transfer_id === transfer.transfer_id && t.id !== transfer.id,
    );

    if (!relatedTransfer) return;

    processedTransfers.add(transfer.transfer_id);

    const fromWallet =
      transfer.amount_cents < 0
        ? transfer.wallet_id
        : relatedTransfer.wallet_id;
    const toWallet =
      transfer.amount_cents < 0
        ? relatedTransfer.wallet_id
        : transfer.wallet_id;
    const amount = Math.abs(transfer.amount_cents);

    const key = `${fromWallet}-${toWallet}`;

    if (!transferGroups[key]) {
      transferGroups[key] = {
        from_wallet_id: fromWallet,
        to_wallet_id: toWallet,
        total_amount_cents: 0,
        transfer_count: 0,
      };
    }

    transferGroups[key].total_amount_cents += amount;
    transferGroups[key].transfer_count += 1;
  });

  const result: TransferFlowData[] = Object.values(transferGroups)
    .map((group) => ({
      ...group,
      from_wallet_name: walletMap.get(group.from_wallet_id) || "Unknown",
      to_wallet_name: walletMap.get(group.to_wallet_id) || "Unknown",
    }))
    .sort((a, b) => b.total_amount_cents - a.total_amount_cents);

  return { data: result, error: null };
};

export interface MonthlySpendingVsIncomeData {
  month: string;
  income: number;
  spending: number;
  net: number;
}

export interface SpendingVsIncomeStatistics {
  avgIncome: number;
  avgSpending: number;
  avgNet: number;
  savingsRate: number;
  monthsIncluded: number;
  monthsExcluded: number;
}

export interface AverageMonthlySpendingVsIncomeResult {
  monthlyData: MonthlySpendingVsIncomeData[];
  statistics: SpendingVsIncomeStatistics;
}

export const getAverageMonthlySpendingVsIncome = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
  conversionRates: Record<string, { rate: number }>,
  baseCurrency: string,
  walletMap: Map<string, { id: string; currency: string }>,
): Promise<{ data: AverageMonthlySpendingVsIncomeResult | null; error: any }> => {
  const { data: monthlyStats, error: statsError } = await getMonthlyStats(
    client,
    params,
  );

  if (statsError || !monthlyStats) {
    return { data: null, error: statsError };
  }

  // Group by month and aggregate across wallets
  const monthGroups: Record<
    string,
    { income: number; spending: number }
  > = {};

  monthlyStats.forEach((stat) => {
    if (!monthGroups[stat.month]) {
      monthGroups[stat.month] = { income: 0, spending: 0 };
    }

    // Apply currency conversion
    const wallet = walletMap.get(stat.wallet_id!);
    if (!wallet) return;

    const rate = conversionRates[wallet.currency]?.rate ?? 1;
    const convertedIncome = (stat.income_cents * rate) / 100;
    const convertedSpending = (stat.outcome_cents * rate) / 100;

    monthGroups[stat.month].income += convertedIncome;
    monthGroups[stat.month].spending += convertedSpending;
  });

  // Convert to array and sort by month
  const monthlyData: MonthlySpendingVsIncomeData[] = Object.entries(monthGroups)
    .map(([month, values]) => ({
      month,
      income: values.income,
      spending: values.spending,
      net: values.income - values.spending,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Calculate statistics using trimmed mean
  // Need at least 4 months for trimmed mean
  const hasEnoughData = monthlyData.length >= 4;

  if (!hasEnoughData) {
    return {
      data: {
        monthlyData,
        statistics: {
          avgIncome: 0,
          avgSpending: 0,
          avgNet: 0,
          savingsRate: 0,
          monthsIncluded: 0,
          monthsExcluded: 0,
        },
      },
      error: null,
    };
  }

  // Extract arrays for trimmed mean calculation
  const incomeValues = monthlyData.map((m) => m.income);
  const spendingValues = monthlyData.map((m) => m.spending);

  // Sort and calculate trim indices (5% from each end)
  const trimPercentage = 0.05;
  const trimCount = Math.floor(monthlyData.length * trimPercentage);

  const sortedIncome = [...incomeValues].sort((a, b) => a - b);
  const sortedSpending = [...spendingValues].sort((a, b) => a - b);

  // Trim outliers
  const trimmedIncome = sortedIncome.slice(
    trimCount,
    sortedIncome.length - trimCount,
  );
  const trimmedSpending = sortedSpending.slice(
    trimCount,
    sortedSpending.length - trimCount,
  );

  // Calculate averages
  const avgIncome =
    trimmedIncome.reduce((sum, val) => sum + val, 0) / trimmedIncome.length;
  const avgSpending =
    trimmedSpending.reduce((sum, val) => sum + val, 0) / trimmedSpending.length;
  const avgNet = avgIncome - avgSpending;

  // Calculate savings rate (handle division by zero)
  const savingsRate = avgIncome > 0 ? (avgNet / avgIncome) * 100 : 0;

  const statistics: SpendingVsIncomeStatistics = {
    avgIncome,
    avgSpending,
    avgNet,
    savingsRate,
    monthsIncluded: trimmedIncome.length,
    monthsExcluded: trimCount * 2,
  };

  return {
    data: {
      monthlyData,
      statistics,
    },
    error: null,
  };
};

export interface NetBalanceDataPoint {
  month: string; // YYYY-MM-01 format
  wallet_id: string;
  bills_due_cents: number; // Bills due this month (by due_date)
  payments_made_cents: number; // Payments to bills this month (by transaction date)
  net_balance_cents: number; // Running total: payments - bills
}

export const getWalletNetBalance = async (
  client: TypedSupabaseClient,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
) => {
  // Get all bills with payments
  const { data: bills, error } = await listBillsWithPayments(client, {
    walletId: params.walletId,
  });

  if (error || !bills) {
    return { data: null, error };
  }

  // Track monthly bills (by due_date) and payments (by transaction.date)
  const monthlyBills: Record<string, Record<string, number>> = {};
  const monthlyPayments: Record<string, Record<string, number>> = {};

  // Group bills by due_date month
  bills.forEach((bill) => {
    const dueDate = new Date(bill.due_date);
    const month = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-01`;

    // Apply date filters
    if (params.from && month < params.from) return;
    if (params.to && month > params.to) return;

    if (!monthlyBills[month]) {
      monthlyBills[month] = {};
    }

    if (!monthlyBills[month][bill.wallet_id]) {
      monthlyBills[month][bill.wallet_id] = 0;
    }

    // Bills are debt (negative in concept, but stored as positive)
    monthlyBills[month][bill.wallet_id] += bill.amount_cents;
  });

  // Group payments by transaction.date month
  bills.forEach((bill) => {
    bill.payments.forEach((payment) => {
      if (!payment.transaction) return;

      const paymentDate = new Date(payment.transaction.date);
      const month = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}-01`;

      // Apply date filters
      if (params.from && month < params.from) return;
      if (params.to && month > params.to) return;

      if (!monthlyPayments[month]) {
        monthlyPayments[month] = {};
      }

      if (!monthlyPayments[month][bill.wallet_id]) {
        monthlyPayments[month][bill.wallet_id] = 0;
      }

      // Payments repay debt (positive in concept)
      monthlyPayments[month][bill.wallet_id] += Math.abs(
        payment.transaction.amount_cents,
      );
    });
  });

  // Combine bills and payments into unified monthly data
  const allMonths = new Set([
    ...Object.keys(monthlyBills),
    ...Object.keys(monthlyPayments),
  ]);

  const monthlyData: NetBalanceDataPoint[] = [];

  allMonths.forEach((month) => {
    const walletIds = new Set([
      ...Object.keys(monthlyBills[month] || {}),
      ...Object.keys(monthlyPayments[month] || {}),
    ]);

    walletIds.forEach((walletId) => {
      const billsDue = monthlyBills[month]?.[walletId] || 0;
      const paymentsMade = monthlyPayments[month]?.[walletId] || 0;

      monthlyData.push({
        month,
        wallet_id: walletId,
        bills_due_cents: billsDue,
        payments_made_cents: paymentsMade,
        net_balance_cents: 0, // Will be calculated in next step
      });
    });
  });

  // Sort by month
  monthlyData.sort((a, b) => a.month.localeCompare(b.month));

  // Calculate running balance (cumulative: payments - bills)
  const walletBalances: Record<string, number> = {};

  monthlyData.forEach((dataPoint) => {
    if (!walletBalances[dataPoint.wallet_id]) {
      walletBalances[dataPoint.wallet_id] = 0;
    }

    // Net change: payments (positive) - bills (negative)
    const netChange = dataPoint.payments_made_cents - dataPoint.bills_due_cents;
    walletBalances[dataPoint.wallet_id] += netChange;

    // Update running balance
    dataPoint.net_balance_cents = walletBalances[dataPoint.wallet_id];
  });

  return { data: monthlyData, error: null };
};
