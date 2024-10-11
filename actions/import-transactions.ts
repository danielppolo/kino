"use server";

import { COLORS, ICONS } from "@/utils/constants";
import { createClient } from "@/utils/supabase/server";

interface ImportTransaction {
  date: string;
  amount: number;
  category: string;
  label: string;
  description?: string;
  type: string;
}

export interface Options {
  missingCategory: "new" | "other";
  missingLabel: "new" | "other";
}

export const importTransactions = async (
  walletId: string,
  transactions: ImportTransaction[],
  { missingCategory, missingLabel }: Options,
) => {
  const supabase = createClient();
  const categoryMap = new Map<string, string>();
  const labelMap = new Map<string, string>();
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("currency")
    .eq("id", walletId)
    .limit(1)
    .single();

  if (walletError) {
    return {
      error: walletError,
    };
  }

  const upsertCategory = async (name: string, type: string) => {
    // Check in the map first
    if (categoryMap.has(name))
      return { error: null, data: categoryMap.get(name) as string };

    // Check in the database
    const { data: existingCategory, error: fetchError } = await supabase
      .from("categories")
      .select("id")
      .eq("name", name)
      .eq("type", type)
      .maybeSingle();

    if (fetchError) {
      return {
        error: fetchError,
        data: null,
      };
    }

    if (existingCategory) {
      categoryMap.set(name, existingCategory.id);
      return {
        error: null,
        data: existingCategory.id,
      };
    }

    // Insert new category
    const { data: newCategory, error: insertError } = await supabase
      .from("categories")
      .insert([
        {
          type,
          name: missingCategory === "new" ? name : "Other",
          icon: ICONS[Math.floor(Math.random() * ICONS.length)],
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      return {
        error: insertError,
        data: null,
      };
    }

    categoryMap.set(name, newCategory.id);
    return {
      error: null,
      data: newCategory.id,
    };
  };

  const upsertLabel = async (name: string) => {
    // Check in the map first
    if (labelMap.has(name))
      return { error: null, data: labelMap.get(name) as string };

    // Check in the database
    const { data: existingLabel, error: fetchError } = await supabase
      .from("labels")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (fetchError) {
      return {
        error: fetchError,
        data: null,
      };
    }

    if (existingLabel) {
      labelMap.set(name, existingLabel.id);
      return {
        error: null,
        data: existingLabel.id,
      };
    }

    // Insert new label
    const { data: newLabel, error: insertError } = await supabase
      .from("labels")
      .insert([
        {
          name: missingLabel === "new" ? name : "Other",
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      return {
        error: insertError,
        data: null,
      };
    }

    labelMap.set(name, newLabel.id);
    return {
      error: null,
      data: newLabel.id,
    };
  };

  const transactionData = [];
  for (const transaction of transactions) {
    const { data: category_id, error: categoryError } = await upsertCategory(
      transaction.category.trim(),
      transaction.type,
    );
    const { data: label_id, error: labelError } = await upsertLabel(
      transaction.label.trim(),
    );

    if (labelError || categoryError) {
      return {
        error: labelError || categoryError,
      };
    }

    transactionData.push({
      wallet_id: walletId,
      date: transaction.date,
      amount_cents: transaction.amount * 100,
      category_id,
      label_id,
      description: transaction.description,
      currency: wallet.currency,
      type: transaction.type,
    });
  }

  const { error } = await supabase
    .from("transactions")
    .upsert(transactionData)
    .select();

  return { error };
};
