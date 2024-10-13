"use server";

import { randomUUID } from "crypto";

import { SupabaseClient } from "@supabase/supabase-js";

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

const getLabel = async ({
  input = DEFAULT_LABEL,
  type,
  map,
  missingLabel,
  supabase,
}: {
  input?: string;
  type: string;
  map: Map<string, string>;
  missingLabel: "new" | "other";
  supabase: SupabaseClient;
}) => {
  if (type !== "income" && type !== "expense") return { data: undefined };

  const name = missingLabel === "new" ? input : DEFAULT_LABEL;

  if (map.has(name)) return { error: null, data: map.get(name) as string };

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

  map.set(newLabel.name, newLabel.id);
  return {
    error: null,
    data: newLabel.id,
  };
};
const getCategory = async ({
  input = DEFAULT_CATEGORY,
  type,
  map,
  missingCategory,
  supabase,
}: {
  input?: string;
  type: string;
  map: Map<string, string>;
  missingCategory: "new" | "other";
  supabase: SupabaseClient;
}) => {
  if (type !== "income" && type !== "expense") return { data: undefined };

  const name = missingCategory === "new" ? input : DEFAULT_CATEGORY;
  if (map.has(name)) return { error: null, data: map.get(name) as string };

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

  map.set(newCategory.name, newCategory.id);
  return {
    error: null,
    data: newCategory.id,
  };
};

export const importTransactions = async (
  walletId: string,
  transactions: ImportTransaction[],
  { missingCategory, missingLabel }: Options,
) => {
  const supabase = createClient();
  const categoryMap = new Map<string, string>();
  const labelMap = new Map<string, string>();
  const transactionMap = new Map<string, string>();
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("currency")
    .eq("id", walletId)
    .limit(1)
    .single();

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id,name");

  const { data: labels, error: labelsError } = await supabase
    .from("labels")
    .select("id,name");

  const { data: orphanTransactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("id,amount_cents,date")
    .is("transfer_id", null);

  if (walletError || categoriesError || labelsError || transactionsError) {
    return {
      error: walletError || categoriesError || labelsError || transactionsError,
    };
  }

  categories.forEach((c) => categoryMap.set(c.name, c.id));
  labels.forEach((l) => labelMap.set(l.name, l.id));
  orphanTransactions.forEach((t) =>
    transactionMap.set(`${t.date}-${Math.abs(t.amount_cents)}`, t.id),
  );

  const transactionData = [];
  for (const transaction of transactions) {
    const type =
      transaction.type === "transfer"
        ? transaction.type
        : transaction.amount > 0
          ? "income"
          : "expense";

    const date = transaction.date.split("T")[0];

    const { data: category_id, error: categoryError } = await getCategory({
      input: transaction?.category?.trim() || undefined,
      type,
      map: categoryMap,
      missingCategory,
      supabase,
    });
    const { data: label_id, error: labelError } = await getLabel({
      input: transaction?.label?.trim() || undefined,
      type,
      map: labelMap,
      missingLabel,
      supabase,
    });

    if (labelError || categoryError) {
      return {
        error: labelError || categoryError,
      };
    }

    let transfer_id;
    const description = transaction.description;
    const amount_cents = Math.round(transaction.amount * 100);
    const counterPartTransactionId = transactionMap.get(
      `${date}-${Math.abs(amount_cents)}`,
    );
    if (counterPartTransactionId) {
      transfer_id = randomUUID();
      await supabase
        .from("transactions")
        .update({ transfer_id })
        .eq("id", counterPartTransactionId);
    }

    transactionData.push({
      wallet_id: walletId,
      date,
      amount_cents,
      category_id,
      label_id,
      description,
      currency: wallet.currency,
      type,
      transfer_id,
    });
  }

  const { error } = await supabase
    .from("transactions")
    .upsert(transactionData)
    .select();

  console.log(error);
  return { error };
};
