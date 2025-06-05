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

export const deleteLabel = async (id: string) => {
  const supabase = await createClient();
  const { error } = await supabase.from("labels").delete().eq("id", id);
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

  // Update each transaction with the correct amount sign based on category
  const updates = transactions.map((transaction) => {
    const isOutgoing =
      transaction.category_id ===
      process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_OUT_ID;
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
