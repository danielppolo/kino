"use server";

import { revalidatePath } from "next/cache";

import { Database } from "./database.types";
import { createClient } from "./server";

const supabase = createClient();

export const createWallet = async (
  walletName: string,
  walletCurrency: string,
) => {
  revalidatePath("/app/transactions", "layout");

  // Get the current authenticated user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { error: userError.message, data: null };

  // Get the 'editor' role ID
  const { data: editorRole, error: editorRoleError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "editor")
    .single();
  if (editorRoleError) return { error: editorRoleError.message, data: null };

  // Call the stored procedure to insert both wallet and user_wallet in a transaction
  const { data, error } = await supabase
    .rpc("insert_wallet_and_user_wallet", {
      wallet_name: walletName,
      wallet_currency: walletCurrency,
      user_id: userData.user.id,
      editor_role_id: editorRole.id,
    })
    .single();

  if (error) return { error: error.message, data: null };

  return { data, error: null };
};

export const createCategory = async (
  data: Database["public"]["Tables"]["categories"]["Insert"],
) => {
  revalidatePath("/app/transactions", "layout");
  revalidatePath("/app/settings/categories", "page");
  return await supabase.from("categories").upsert(data).select();
};

export const createLabel = async (
  data: Database["public"]["Tables"]["labels"]["Insert"],
) => {
  revalidatePath("/app/transactions", "layout");
  revalidatePath("/app/settings/labels", "page");
  return await supabase.from("labels").upsert(data).select();
};

// Update Functions
export const updateTransaction = async (
  data: Database["public"]["Tables"]["transactions"]["Update"],
) => {
  const transaction = data;
  if (transaction.amount_cents) {
    transaction.amount_cents =
      transaction.type === "expense"
        ? -transaction.amount_cents
        : transaction.amount_cents;
  }

  revalidatePath("/app/transactions", "page");
  return await supabase.from("transactions").upsert(transaction).select();
};

export const updateWallet = async (
  data: Database["public"]["Tables"]["wallets"]["Update"],
) => {
  revalidatePath("/app/transactions", "layout");
  return await supabase.from("wallets").upsert(data).select();
};

export const updateCategory = async (
  data: Database["public"]["Tables"]["categories"]["Update"],
) => {
  revalidatePath("/app/settings/categories", "page");
  return await supabase.from("categories").upsert(data).select();
};

export const updateLabel = async (
  data: Database["public"]["Tables"]["labels"]["Update"],
) => {
  revalidatePath("/app/settings/labels", "page");
  return await supabase.from("labels").upsert(data).select();
};

// Delete Functions
export const deleteTransaction = async (id: string) => {
  revalidatePath("/app/transactions", "page");
  return await supabase.from("transactions").delete().eq("id", id);
};

export const deleteWallet = async (id: string) => {
  revalidatePath("/app/transactions", "layout");
  return await supabase.from("wallets").delete().eq("id", id);
};

export const deleteCategory = async (id: string) => {
  revalidatePath("/app/settings/categories", "page");
  return await supabase.from("categories").delete().eq("id", id);
};

export const deleteLabel = async (id: string) => {
  revalidatePath("/app/settings/labels", "page");
  return await supabase.from("labels").delete().eq("id", id);
};
