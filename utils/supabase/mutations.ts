import { createClient } from "./client";
import { Database } from "./database.types";
import { FeatureFlags } from "@/utils/types/feature-flags";

const BATCH_SIZE = 20;

// Helper to chunk array into batches
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export const createWallet = async ({
  name,
  currency,
  workspaceId,
}: {
  name: string;
  currency: string;
  workspaceId: string;
}) => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("insert_wallet_and_user_wallet", {
    wallet_currency: currency,
    wallet_name: name,
    p_workspace_id: workspaceId,
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

export const deleteTransactions = async (ids: string[]) => {
  if (ids.length === 0) return;

  const supabase = await createClient();
  const batches = chunk(ids, BATCH_SIZE);

  for (const batchIds of batches) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .in("id", batchIds);
    if (error) throw new Error(error.message);
  }
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

  // Fetch all transaction IDs that need updating
  const { data: transactions, error: fetchTransactionsError } = await supabase
    .from("transactions")
    .select("id")
    .in("category_id", idsToMerge);

  if (fetchTransactionsError) throw new Error(fetchTransactionsError.message);

  // Batch transaction updates
  if (transactions && transactions.length > 0) {
    const transactionIds = transactions.map((t) => t.id);
    const batches = chunk(transactionIds, BATCH_SIZE);

    for (const batchIds of batches) {
      const { error } = await supabase
        .from("transactions")
        .update({ category_id: targetId })
        .in("id", batchIds);
      if (error) throw new Error(error.message);
    }
  }

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

  // Batch upsert transaction_tags
  if (transactionIds.length > 0) {
    const batches = chunk(transactionIds, BATCH_SIZE);

    for (const batchTransactionIds of batches) {
      const insertRows = batchTransactionIds.map((transaction_id) => ({
        transaction_id,
        tag_id: targetId,
      }));
      const { error: insertError } = await supabase
        .from("transaction_tags")
        .upsert(insertRows);
      if (insertError) throw new Error(insertError.message);
    }
  }

  // Batch delete transaction_tags
  // We already have transactionIds from the fetch above, so we can use those
  if (transactionIds.length > 0) {
    const batches = chunk(transactionIds, BATCH_SIZE);

    for (const batchTransactionIds of batches) {
      const { error: deleteLinkError } = await supabase
        .from("transaction_tags")
        .delete()
        .in("transaction_id", batchTransactionIds)
        .in("tag_id", idsToMerge);
      if (deleteLinkError) throw new Error(deleteLinkError.message);
    }
  } else {
    // If no transactions, still need to delete any remaining transaction_tags
    // (though this should be rare)
    const { error: deleteLinkError } = await supabase
      .from("transaction_tags")
      .delete()
      .in("tag_id", idsToMerge);
    if (deleteLinkError) throw new Error(deleteLinkError.message);
  }

  const { error: deleteError } = await supabase
    .from("tags")
    .delete()
    .in("id", idsToMerge);
  if (deleteError) throw new Error(deleteError.message);
};

export const mergeLabels = async (targetId: string, ids: string[]) => {
  const supabase = await createClient();
  const idsToMerge = ids.filter((id) => id !== targetId);
  if (idsToMerge.length === 0) return;

  // Fetch all transaction IDs that need updating
  const { data: transactions, error: fetchTransactionsError } = await supabase
    .from("transactions")
    .select("id")
    .in("label_id", idsToMerge);

  if (fetchTransactionsError) throw new Error(fetchTransactionsError.message);

  // Batch transaction updates
  if (transactions && transactions.length > 0) {
    const transactionIds = transactions.map((t) => t.id);
    const batches = chunk(transactionIds, BATCH_SIZE);

    for (const batchIds of batches) {
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ label_id: targetId })
        .in("id", batchIds);
      if (updateError) throw new Error(updateError.message);
    }
  }

  // Delete the merged labels
  const { error: deleteError } = await supabase
    .from("labels")
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

export const linkTransactionsToBill = async (
  billId: string,
  transactionIds: string[],
) => {
  if (transactionIds.length === 0) return;

  const supabase = await createClient();
  const batches = chunk(transactionIds, BATCH_SIZE);

  for (const batchIds of batches) {
    const insertData = batchIds.map((transactionId) => ({
      bill_id: billId,
      transaction_id: transactionId,
    }));

    const { error } = await supabase
      .from("bill_payments")
      .insert(insertData);
    if (error) throw new Error(error.message);
  }
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

export const splitTransaction = async (
  transactionId: string,
  splitAmountCents: number,
  billDescription?: string,
  billDueDate?: string,
): Promise<{ matchingTransactionId: string; remainingTransactionId: string }> => {
  const supabase = await createClient();

  // Get the original transaction
  const { data: originalTransaction, error: fetchError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!originalTransaction) throw new Error("Transaction not found");

  // Calculate the remaining amount
  const remainingAmountCents =
    originalTransaction.amount_cents - splitAmountCents;

  if (remainingAmountCents <= 0) {
    throw new Error("Split amount must be less than transaction amount");
  }

  // Prepare the two new transactions
  // Determine description for matching transaction (transaction1)
  let transaction1Description: string;
  if (!originalTransaction.description && billDescription && billDueDate) {
    // Extract YYYY-MM from YYYY-MM-DD
    const yearMonth = billDueDate.substring(0, 7); // Gets "YYYY-MM"
    transaction1Description = `${billDescription} ${yearMonth} (1/2)`;
  } else {
    const baseDescription = originalTransaction.description || "Transaction";
    transaction1Description = `${baseDescription} (1/2)`;
  }

  const transaction1: Database["public"]["Tables"]["transactions"]["Insert"] = {
    amount_cents: splitAmountCents,
    base_amount_cents: originalTransaction.base_amount_cents
      ? Math.round(
          (originalTransaction.base_amount_cents * splitAmountCents) /
            originalTransaction.amount_cents,
        )
      : null,
    category_id: originalTransaction.category_id,
    conversion_rate_to_base: originalTransaction.conversion_rate_to_base,
    currency: originalTransaction.currency,
    date: originalTransaction.date,
    description: transaction1Description,
    label_id: originalTransaction.label_id,
    note: originalTransaction.note,
    tags: originalTransaction.tags,
    type: originalTransaction.type,
    wallet_id: originalTransaction.wallet_id,
  };

  // Determine description for remaining transaction (transaction2)
  let transaction2Description: string | null;
  if (!originalTransaction.description) {
    // Keep no description if original had none
    transaction2Description = null;
  } else {
    transaction2Description = `${originalTransaction.description} (2/2)`;
  }

  const transaction2: Database["public"]["Tables"]["transactions"]["Insert"] = {
    amount_cents: remainingAmountCents,
    base_amount_cents: originalTransaction.base_amount_cents
      ? Math.round(
          (originalTransaction.base_amount_cents * remainingAmountCents) /
            originalTransaction.amount_cents,
        )
      : null,
    category_id: originalTransaction.category_id,
    conversion_rate_to_base: originalTransaction.conversion_rate_to_base,
    currency: originalTransaction.currency,
    date: originalTransaction.date,
    description: transaction2Description,
    label_id: originalTransaction.label_id,
    note: originalTransaction.note,
    tags: originalTransaction.tags,
    type: originalTransaction.type,
    wallet_id: originalTransaction.wallet_id,
  };

  // Insert the new transactions
  const { data: newTransactions, error: insertError } = await supabase
    .from("transactions")
    .insert([transaction1, transaction2])
    .select();

  if (insertError) throw new Error(insertError.message);
  if (!newTransactions || newTransactions.length !== 2) {
    throw new Error("Failed to create split transactions");
  }

  // Delete the original transaction
  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (deleteError) throw new Error(deleteError.message);

  return {
    matchingTransactionId: newTransactions[0].id,
    remainingTransactionId: newTransactions[1].id,
  };
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

// User wallet member management functions
export const addWalletMember = async (
  walletId: string,
  email: string,
  role: "editor" | "reader",
) => {
  const supabase = await createClient();

  // Look up user by email
  const { data: userData, error: lookupError } = await supabase.rpc(
    "get_user_id_by_email",
    { user_email: email },
  );

  if (lookupError) throw new Error(lookupError.message);
  if (!userData || userData.length === 0) {
    throw new Error(`User with email ${email} not found`);
  }

  const userId = userData[0].user_id;

  // Add user to wallet
  const { data, error } = await supabase
    .from("user_wallets")
    .insert({
      wallet_id: walletId,
      user_id: userId,
      role,
    })
    .select();

  if (error) throw new Error(error.message);
  return data;
};

export const updateWalletMemberRole = async (
  id: string,
  role: "owner" | "editor" | "reader",
) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_wallets")
    .update({ role })
    .eq("id", id)
    .select();

  if (error) throw new Error(error.message);
  return data;
};

export const removeWalletMember = async (id: string) => {
  const supabase = await createClient();

  const { error } = await supabase.from("user_wallets").delete().eq("id", id);

  if (error) throw new Error(error.message);
};

export const updateUserPhone = async (
  userId: string,
  phone: string | null,
) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: userId, phone }, { onConflict: "user_id" })
    .select();

  if (error) throw new Error(error.message);
  return data;
};

export const updateUserPreferences = async (params: {
  userId: string;
  phone?: string | null;
}) => {
  const supabase = await createClient();

  const updateData: {
    user_id: string;
    phone?: string | null;
  } = {
    user_id: params.userId,
  };

  if (params.phone !== undefined) {
    updateData.phone = params.phone;
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(updateData, { onConflict: "user_id" })
    .select();

  if (error) throw new Error(error.message);
  return data;
};

// ============================================================================
// Workspace Mutations
// ============================================================================

export const createWorkspace = async (name: string, userId: string) => {
  const supabase = await createClient();

  // Create the workspace
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name })
    .select()
    .single();

  if (workspaceError) throw new Error(workspaceError.message);

  // Add the user as owner
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: "owner",
    });

  if (memberError) throw new Error(memberError.message);

  return workspace;
};

export const updateWorkspace = async (id: string, name: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .update({ name })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateWorkspaceFeatureFlags = async (
  workspaceId: string,
  featureFlags: FeatureFlags,
) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .update({ feature_flags: featureFlags as any })
    .eq("id", workspaceId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateWorkspaceBaseCurrency = async (
  workspaceId: string,
  baseCurrency: string,
) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .update({ base_currency: baseCurrency })
    .eq("id", workspaceId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteWorkspace = async (id: string) => {
  const supabase = await createClient();

  const { error } = await supabase.from("workspaces").delete().eq("id", id);

  if (error) throw new Error(error.message);
};

export const addWorkspaceMember = async (
  workspaceId: string,
  email: string,
  role: "owner" | "editor" | "reader",
) => {
  const supabase = await createClient();

  // First, look up the user by email
  const { data: user, error: userError } = await supabase.rpc(
    "lookup_user_by_email",
    { user_email: email },
  );

  if (userError) throw new Error(userError.message);
  if (!user || user.length === 0) {
    throw new Error("No user found with that email address");
  }

  const userId = user[0].id;

  // Add the user to the workspace
  const { data, error } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      role,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateWorkspaceMemberRole = async (
  memberId: string,
  role: "owner" | "editor" | "reader",
) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("id", memberId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const removeWorkspaceMember = async (memberId: string) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId);

  if (error) throw new Error(error.message);
};

export const switchActiveWorkspace = async (
  userId: string,
  workspaceId: string,
) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        active_workspace_id: workspaceId,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};
