"use server";

import { revalidatePath } from "next/cache";

import { COLORS, ICONS } from "../constants";
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

type ImportTransaction = {
  wallet_id: string;
  date: string;
  amount: number;
  category: string;
  label: string;
  description?: string;
  currency: string;
  type: string;
};

export const importTransactions = async (transactions: ImportTransaction[]) => {
  const supabase = createClient();

  const categoryMap = new Map<string, string>();
  const labelMap = new Map<string, string>();

  const upsertCategory = async (name: string, type: string) => {
    // Check in the map first
    if (categoryMap.has(name)) return categoryMap.get(name);

    // Check in the database
    const { data: existingCategory, error: fetchError } = await supabase
      .from("categories")
      .select("id")
      .eq("name", name)
      .single();

    if (existingCategory) {
      categoryMap.set(name, existingCategory.id);
      return existingCategory.id;
    }

    // Insert new category
    const { data: newCategory, error: insertError } = await supabase
      .from("categories")
      .insert([
        { type, name, icon: ICONS[Math.floor(Math.random() * ICONS.length)] },
      ])
      .select("id")
      .single();

    if (newCategory) {
      categoryMap.set(name, newCategory.id);
      return newCategory.id;
    }
  };

  const upsertLabel = async (name: string) => {
    // Check in the map first
    if (labelMap.has(name)) return labelMap.get(name);

    // Check in the database
    const { data: existingLabel, error: fetchError } = await supabase
      .from("labels")
      .select("id")
      .eq("name", name)
      .single();

    if (existingLabel) {
      labelMap.set(name, existingLabel.id);
      return existingLabel.id;
    }

    // Insert new label
    const { data: newLabel, error: insertError } = await supabase
      .from("labels")
      .insert([
        { name, color: COLORS[Math.floor(Math.random() * COLORS.length)] },
      ])
      .select("id")
      .single();

    if (newLabel) {
      labelMap.set(name, newLabel.id);
      return newLabel.id;
    }
  };

  const transactionData = await Promise.all(
    transactions.map(async (transaction) => {
      const category_id = await upsertCategory(
        transaction.category.trim(),
        transaction.type,
      );
      const label_id = await upsertLabel(transaction.label.trim());

      return {
        wallet_id: transaction.wallet_id,
        date: transaction.date,
        amount_cents: transaction.amount * 100,
        category_id,
        label_id,
        description: transaction.description,
        currency: transaction.currency,
        type: transaction.type,
      };
    }),
  );

  return await supabase.from("transactions").upsert(transactionData).select();
};
