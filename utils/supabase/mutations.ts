"use server";

import { revalidatePath } from "next/cache";

import { Database } from "./database.types";
import { createClient } from "./server";

const supabase = createClient();

// Create Functions
export const createTransaction = async (
  data: Database["public"]["Tables"]["transactions"]["Insert"],
) => {
  revalidatePath("/app/(app)/transactions", "page");
  return await supabase.from("transactions").upsert(data).select();
};

export const createWallet = async (
  data: Database["public"]["Tables"]["wallets"]["Insert"],
) => {
  revalidatePath("/app/(app)/transactions", "layout");
  return await supabase.from("wallets").upsert(data).select();
};

export const createCategory = async (
  data: Database["public"]["Tables"]["categories"]["Insert"],
) => {
  revalidatePath("/app/(app)/transactions", "layout");
  revalidatePath("/app/(app)/settings/categories", "page");
  return await supabase.from("categories").upsert(data).select();
};

export const createLabel = async (
  data: Database["public"]["Tables"]["labels"]["Insert"],
) => {
  revalidatePath("/app/(app)/transactions", "layout");
  revalidatePath("/app/(app)/settings/labels", "page");
  return await supabase.from("labels").upsert(data).select();
};

// Update Functions
export const updateTransaction = async (
  data: Database["public"]["Tables"]["transactions"]["Update"],
) => {
  revalidatePath("/app/(app)/transactions", "page");
  return await supabase.from("transactions").upsert(data).select();
};

export const updateWallet = async (
  data: Database["public"]["Tables"]["wallets"]["Update"],
) => {
  revalidatePath("/app/(app)/transactions", "layout");
  return await supabase.from("wallets").upsert(data).select();
};

export const updateCategory = async (
  data: Database["public"]["Tables"]["categories"]["Update"],
) => {
  revalidatePath("/app/(app)/settings/categories", "page");
  return await supabase.from("categories").upsert(data).select();
};

export const updateLabel = async (
  data: Database["public"]["Tables"]["labels"]["Update"],
) => {
  revalidatePath("/app/(app)/settings/labels", "page");
  return await supabase.from("labels").upsert(data).select();
};

// Delete Functions
export const deleteTransaction = async (id: string) => {
  revalidatePath("/app/(app)/transactions", "page");
  return await supabase.from("transactions").delete().eq("id", id);
};

export const deleteWallet = async (id: string) => {
  revalidatePath("/app/(app)/transactions", "layout");
  return await supabase.from("wallets").delete().eq("id", id);
};

export const deleteCategory = async (id: string) => {
  revalidatePath("/app/(app)/settings/categories", "page");
  return await supabase.from("categories").delete().eq("id", id);
};

export const deleteLabel = async (id: string) => {
  revalidatePath("/app/(app)/settings/labels", "page");
  return await supabase.from("labels").delete().eq("id", id);
};
