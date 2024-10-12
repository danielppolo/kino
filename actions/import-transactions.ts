"use server";

import { COLORS, ICONS } from "@/utils/constants";
import { createClient } from "@/utils/supabase/server";

interface ImportTransaction {
  date: string;
  amount: number;
  category: string;
  label: string;
  description?: string;
  type?: string;
}

export interface Options {
  missingCategory: "new" | "other";
  missingLabel: "new" | "other";
}

const DEFAULT_CATEGORY = "Other";
const DEFAULT_LABEL = "Other";

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

  // Check in the database
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id,name");

  // Check in the database
  const { data: labels, error: labelsError } = await supabase
    .from("labels")
    .select("id,name");

  if (walletError || categoriesError || labelsError) {
    return {
      error: walletError || categoriesError || labelsError,
    };
  }

  categories.forEach((c) => categoryMap.set(c.name, c.id));
  labels.forEach((l) => labelMap.set(l.name, l.id));

  const upsertCategory = async (input = DEFAULT_CATEGORY, type: string) => {
    if (type !== "income" && type !== "expense") return { data: undefined };

    const name = missingCategory === "new" ? input : DEFAULT_CATEGORY;
    if (categoryMap.has(name))
      return { error: null, data: categoryMap.get(name) as string };

    const { data: newCategory, error: insertError } = await supabase
      .from("categories")
      .insert([
        {
          type,
          name,
          icon: ICONS[Math.floor(Math.random() * ICONS.length)],
        },
      ])
      .select("id,name")
      .single();

    if (insertError) {
      return {
        error: insertError,
        data: null,
      };
    }

    categoryMap.set(newCategory.name, newCategory.id);
    return {
      error: null,
      data: newCategory.id,
    };
  };

  const upsertLabel = async (input = DEFAULT_LABEL, type: string) => {
    if (type !== "income" && type !== "expense") return { data: undefined };

    const name = missingLabel === "new" ? input : DEFAULT_LABEL;

    if (labelMap.has(name))
      return { error: null, data: labelMap.get(name) as string };

    const { data: newLabel, error: insertError } = await supabase
      .from("labels")
      .insert([
        {
          name,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        },
      ])
      .select("id,name")
      .single();

    if (insertError) {
      return {
        error: insertError,
        data: null,
      };
    }

    labelMap.set(newLabel.name, newLabel.id);
    return {
      error: null,
      data: newLabel.id,
    };
  };

  const transactionData = [];
  for (const transaction of transactions) {
    const type = transaction.type
      ? transaction.type
      : transaction.amount > 0
        ? "income"
        : "expense";

    const { data: category_id, error: categoryError } = await upsertCategory(
      transaction?.category?.trim() || undefined,
      type,
    );
    const { data: label_id, error: labelError } = await upsertLabel(
      transaction?.label?.trim() || undefined,
      type,
    );

    if (labelError || categoryError) {
      return {
        error: labelError || categoryError,
      };
    }

    transactionData.push({
      wallet_id: walletId,
      date: transaction.date,
      amount_cents: Math.round(transaction.amount * 100),
      category_id,
      label_id,
      description: transaction.description,
      currency: wallet.currency,
      type,
    });
  }

  const { error } = await supabase
    .from("transactions")
    .upsert(transactionData)
    .select();

  return { error };
};
