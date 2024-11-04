"use server";

import { revalidatePath } from "next/cache";

import { Database } from "./database.types";
import { createClient } from "./server";

export const createWallet = async ({
  name,
  currency,
}: {
  name: string;
  currency: string;
}) => {
  revalidatePath("/app/transactions", "layout");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("insert_wallet_and_user_wallet", {
    wallet_currency: currency,
    wallet_name: name,
  });

  if (error) return { error: error.message, data: null };

  return { data, error: null };
};

export const createCategory = async (
  data: Database["public"]["Tables"]["categories"]["Insert"],
) => {
  revalidatePath("/app/transactions", "layout");
  revalidatePath("/app/settings/categories", "page");
  const supabase = await createClient();

  return await supabase.from("categories").upsert(data).select();
};

export const createLabel = async (
  data: Database["public"]["Tables"]["labels"]["Insert"],
) => {
  revalidatePath("/app/transactions", "layout");
  revalidatePath("/app/settings/labels", "page");
  const supabase = await createClient();

  return await supabase.from("labels").upsert(data).select();
};

// Update Functions
export const updateTransaction = async (
  data: Database["public"]["Tables"]["transactions"]["Update"],
) => {
  const supabase = await createClient();
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
  const supabase = await createClient();
  revalidatePath("/app/transactions", "layout");
  return await supabase.from("wallets").upsert(data).select();
};

export const updateCategory = async (
  data: Database["public"]["Tables"]["categories"]["Update"],
) => {
  const supabase = await createClient();
  revalidatePath("/app/settings/categories", "page");
  return await supabase.from("categories").upsert(data).select();
};

export const updateLabel = async (
  data: Database["public"]["Tables"]["labels"]["Update"],
) => {
  const supabase = await createClient();
  revalidatePath("/app/settings/labels", "page");
  return await supabase.from("labels").upsert(data).select();
};

// Delete Functions
export const deleteTransaction = async (id: string) => {
  const supabase = await createClient();
  revalidatePath("/app/transactions", "page");
  return await supabase.from("transactions").delete().eq("id", id);
};

export const deleteWallet = async (id: string) => {
  const supabase = await createClient();
  revalidatePath("/app/transactions", "layout");
  return await supabase.from("wallets").delete().eq("id", id);
};

export const deleteCategory = async (id: string) => {
  const supabase = await createClient();
  revalidatePath("/app/settings/categories", "page");
  return await supabase.from("categories").delete().eq("id", id);
};

export const deleteLabel = async (id: string) => {
  const supabase = await createClient();
  revalidatePath("/app/settings/labels", "page");
  return await supabase.from("labels").delete().eq("id", id);
};
