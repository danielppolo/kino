import { createClient } from "./client";
import { Database } from "./database.types";

export const createWallet = async ({
  name,
  currency,
}: {
  name: string;
  currency: string;
}) => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("insert_wallet_and_user_wallet", {
    wallet_currency: currency,
    wallet_name: name,
  });

  if (error) throw new Error(error.message);

  return data;
};

export const createCategory = async (
  data: Database["public"]["Tables"]["categories"]["Insert"],
) => {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("categories")
    .upsert(data)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const createLabel = async (
  data: Database["public"]["Tables"]["labels"]["Insert"],
) => {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("labels")
    .upsert(data)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const createTag = async (
  data: Database["public"]["Tables"]["tags"]["Insert"],
) => {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("tags")
    .upsert(data)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const createView = async (
  data: Database["public"]["Tables"]["views"]["Insert"],
) => {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("views")
    .upsert(data)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const createTransactionTemplate = async (
  data: Database["public"]["Tables"]["transaction_templates"]["Insert"],
) => {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("transaction_templates")
    .upsert(data)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const updateWallet = async (
  data: Database["public"]["Tables"]["wallets"]["Update"],
) => {
  const supabase = await createClient();

  // Ensure required fields are present
  if (!data.currency || !data.name) {
    throw new Error("Currency and name are required fields for wallet updates");
  }

  const wallet = {
    ...data,
    currency: data.currency,
    name: data.name,
  } satisfies Database["public"]["Tables"]["wallets"]["Update"];

  const { data: result, error } = await supabase
    .from("wallets")
    .upsert(wallet)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const updateCategory = async (
  data: Database["public"]["Tables"]["categories"]["Update"],
) => {
  const supabase = await createClient();

  // Ensure required fields are present
  if (!data.icon || !data.name || !data.type) {
    throw new Error(
      "Icon, name, and type are required fields for category updates",
    );
  }

  const category = {
    ...data,
    icon: data.icon,
    name: data.name,
    type: data.type,
  } satisfies Database["public"]["Tables"]["categories"]["Update"];

  const { data: result, error } = await supabase
    .from("categories")
    .upsert(category)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const updateLabel = async (
  data: Database["public"]["Tables"]["labels"]["Update"],
) => {
  const supabase = await createClient();

  // Ensure required fields are present
  if (!data.color || !data.name) {
    throw new Error("Color and name are required fields for label updates");
  }

  const label = {
    ...data,
    color: data.color,
    name: data.name,
  } satisfies Database["public"]["Tables"]["labels"]["Update"];

  const { data: result, error } = await supabase
    .from("labels")
    .upsert(label)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const updateTag = async (
  data: Database["public"]["Tables"]["tags"]["Update"],
) => {
  const supabase = await createClient();

  if (!data.title) {
    throw new Error("Title is required for tag updates");
  }

  const tag = {
    ...data,
    title: data.title,
  } satisfies Database["public"]["Tables"]["tags"]["Update"];

  const { data: result, error } = await supabase
    .from("tags")
    .upsert(tag)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const updateTransactionTemplate = async (
  data: Database["public"]["Tables"]["transaction_templates"]["Update"],
) => {
  const supabase = await createClient();

  // Ensure required fields are present for update
  if (
    !data.name ||
    !data.type ||
    data.amount_cents === undefined ||
    !data.currency
  ) {
    throw new Error(
      "Name, type, amount_cents, and currency are required fields for template updates",
    );
  }

  const template = {
    ...data,
    name: data.name,
    type: data.type,
    amount_cents: data.amount_cents,
    currency: data.currency,
  } satisfies Database["public"]["Tables"]["transaction_templates"]["Update"];

  const { data: result, error } = await supabase
    .from("transaction_templates")
    .upsert(template)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

// Delete Functions
export const deleteTransaction = async (id: string) => {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const deleteWallet = async (id: string) => {
  const supabase = await createClient();
  const { error } = await supabase.from("wallets").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const deleteCategory = async (id: string) => {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const deleteCategories = async (ids: string[]) => {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().in("id", ids);
  if (error) throw new Error(error.message);
};

export const deleteLabel = async (id: string) => {
  const supabase = await createClient();
  const { error } = await supabase.from("labels").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const deleteLabels = async (ids: string[]) => {
  const supabase = await createClient();
  const { error } = await supabase.from("labels").delete().in("id", ids);
  if (error) throw new Error(error.message);
};

export const deleteTag = async (id: string) => {
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const deleteTags = async (ids: string[]) => {
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().in("id", ids);
  if (error) throw new Error(error.message);
};

export const deleteViews = async (ids: string[]) => {
  const supabase = await createClient();
  const { error } = await supabase.from("views").delete().in("id", ids);
  if (error) throw new Error(error.message);
};

export const deleteTransactionTemplate = async (id: string) => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transaction_templates")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
};

export const deleteTransfer = async (transferId: string) => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("transfer_id", transferId);
  if (error) throw new Error(error.message);
};

export const updateTransfer = async (
  transferId: string,
  data: { description?: string; amount_cents: number },
) => {
  const supabase = await createClient();

  // First, get the transactions to determine their categories
  const { data: transactions, error: fetchError } = await supabase
    .from("transactions")
    .select("id, category_id")
    .eq("transfer_id", transferId);

  if (fetchError) throw new Error(fetchError.message);
  if (!transactions || transactions.length !== 2) {
    throw new Error("Invalid transfer: expected exactly 2 transactions");
  }

  // Update each transaction with the correct amount sign based on direction
  // categories (sender or receiver)
  const updates = transactions.map((transaction) => {
    const isOutgoing =
      transaction.category_id ===
      process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_OUT_ID;
    const isIncoming =
      transaction.category_id ===
      process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_IN_ID;

    if (!isOutgoing && !isIncoming) {
      throw new Error("Invalid transfer category");
    }

    return supabase
      .from("transactions")
      .update({
        description: data.description,
        amount_cents: isOutgoing ? -data.amount_cents : data.amount_cents,
      })
      .eq("id", transaction.id);
  });

  // Execute all updates
  const results = await Promise.all(updates);
  const error = results.find((result) => result.error)?.error;

  if (error) throw new Error(error.message);
};

export const mergeCategories = async (targetId: string, ids: string[]) => {
  const supabase = await createClient();
  const idsToMerge = ids.filter((id) => id !== targetId);
  if (idsToMerge.length === 0) return;

  // Fetch all categories to validate their types
  const { data: categories, error: fetchError } = await supabase
    .from("categories")
    .select("id, type")
    .in("id", [...idsToMerge, targetId]);

  if (fetchError) throw new Error(fetchError.message);
  if (!categories || categories.length === 0) {
    throw new Error("No categories found");
  }

  // Check if any category is of type "transfer"
  const transferCategories = categories.filter(
    (cat) => cat.type === "transfer",
  );
  if (transferCategories.length > 0) {
    throw new Error("Merging transfer categories is not allowed");
  }

  // Validate all categories have the same type
  const categoryTypes = Array.from(new Set(categories.map((cat) => cat.type)));
  if (categoryTypes.length > 1) {
    throw new Error(
      "All categories must be of the same type (income or expense)",
    );
  }

  const { error } = await supabase
    .from("transactions")
    .update({ category_id: targetId })
    .in("category_id", idsToMerge);
  if (error) throw new Error(error.message);

  const { error: deleteError } = await supabase
    .from("categories")
    .delete()
    .in("id", idsToMerge);
  if (deleteError) throw new Error(deleteError.message);
};

export const mergeTags = async (targetId: string, ids: string[]) => {
  const supabase = await createClient();
  const idsToMerge = ids.filter((id) => id !== targetId);
  if (idsToMerge.length === 0) return;

  const { data: rows, error: fetchError } = await supabase
    .from("transaction_tags")
    .select("transaction_id")
    .in("tag_id", idsToMerge);
  if (fetchError) throw new Error(fetchError.message);

  const transactionIds = Array.from(
    new Set(rows?.map((r) => r.transaction_id) || []),
  );

  if (transactionIds.length > 0) {
    const insertRows = transactionIds.map((transaction_id) => ({
      transaction_id,
      tag_id: targetId,
    }));
    const { error: insertError } = await supabase
      .from("transaction_tags")
      .upsert(insertRows);
    if (insertError) throw new Error(insertError.message);
  }

  const { error: deleteLinkError } = await supabase
    .from("transaction_tags")
    .delete()
    .in("tag_id", idsToMerge);
  if (deleteLinkError) throw new Error(deleteLinkError.message);

  const { error: deleteError } = await supabase
    .from("tags")
    .delete()
    .in("id", idsToMerge);
  if (deleteError) throw new Error(deleteError.message);
};

export const updateTransactionCategoriesByTag = async (
  tagId: string,
  newCategoryId: string,
) => {
  const supabase = await createClient();

  // First, get all transaction IDs associated with this tag
  const { data: transactionTags, error: fetchError } = await supabase
    .from("transaction_tags")
    .select("transaction_id")
    .eq("tag_id", tagId);

  if (fetchError) throw new Error(fetchError.message);

  if (!transactionTags || transactionTags.length === 0) {
    return { updatedCount: 0 };
  }

  const transactionIds = transactionTags.map((tt) => tt.transaction_id);

  // Update all transactions with the new category
  const { error: updateError } = await supabase
    .from("transactions")
    .update({ category_id: newCategoryId })
    .in("id", transactionIds);

  if (updateError) throw new Error(updateError.message);

  return { updatedCount: transactionIds.length };
};

export const createRecurringTransaction = async (data: {
  wallet_id: string;
  category_id: string;
  label_id?: string | null;
  amount_cents: number;
  currency: string;
  description?: string | null;
  interval_type: string;
  start_date: string;
  end_date?: string | null;
  type: "income" | "expense";
  tags?: string[] | null;
}) => {
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from("recurring_transactions")
    .insert(data)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const updateRecurringTransaction = async (
  id: string,
  data: {
    wallet_id?: string;
    category_id?: string;
    label_id?: string | null;
    amount_cents?: number;
    currency?: string;
    description?: string | null;
    interval_type?: string;
    start_date?: string;
    end_date?: string | null;
    tags?: string[] | null;
  },
) => {
  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from("recurring_transactions")
    .update(data)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const deleteRecurringTransaction = async (id: string) => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_transactions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
};

// Bills mutations
export const createBill = async (
  data: Database["public"]["Tables"]["bills"]["Insert"],
) => {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("bills")
    .insert(data)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const updateBill = async (
  data: Database["public"]["Tables"]["bills"]["Update"],
) => {
  const supabase = await createClient();

  if (!data.id) {
    throw new Error("Bill ID is required for updates");
  }

  const { data: result, error } = await supabase
    .from("bills")
    .update(data)
    .eq("id", data.id)
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const deleteBill = async (id: string) => {
  const supabase = await createClient();
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const deleteBills = async (ids: string[]) => {
  const supabase = await createClient();
  const { error } = await supabase.from("bills").delete().in("id", ids);
  if (error) throw new Error(error.message);
};

export const linkTransactionToBill = async (
  billId: string,
  transactionId: string,
) => {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from("bill_payments")
    .insert({ bill_id: billId, transaction_id: transactionId })
    .select();
  if (error) throw new Error(error.message);
  return result;
};

export const unlinkTransactionFromBill = async (
  billId: string,
  transactionId: string,
) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bill_payments")
    .delete()
    .eq("bill_id", billId)
    .eq("transaction_id", transactionId);
  if (error) throw new Error(error.message);
};

export const setTransactionBills = async (
  transactionId: string,
  billIds: string[],
) => {
  const supabase = await createClient();

  // First, remove all existing bill links for this transaction
  const { error: deleteError } = await supabase
    .from("bill_payments")
    .delete()
    .eq("transaction_id", transactionId);
  if (deleteError) throw new Error(deleteError.message);

  // Then, add new bill links
  if (billIds.length > 0) {
    const insertData = billIds.map((billId) => ({
      bill_id: billId,
      transaction_id: transactionId,
    }));
    const { error: insertError } = await supabase
      .from("bill_payments")
      .insert(insertData);
    if (insertError) throw new Error(insertError.message);
  }
};
