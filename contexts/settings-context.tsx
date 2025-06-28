"use client";

import React, { createContext, ReactNode, useContext } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";

import { TRANSFER_CATEGORIES } from "@/utils/constants";
import { fetchAllConversions } from "@/utils/fetch-conversions";
import { createClient } from "@/utils/supabase/client";
import {
  listCategories,
  listLabels,
  listTags,
  listWallets,
} from "@/utils/supabase/queries";
import { Category, Label, Tag, Wallet } from "@/utils/supabase/types";

export interface CurrencyConversion {
  rate: number;
  lastUpdated: string;
  source: "cache" | "api" | "direct";
}

interface SettingsContextType {
  categories: Category[];
  labels: Label[];
  tags: Tag[];
  wallets: Wallet[];
  conversionRates: Record<string, CurrencyConversion>;
  baseCurrency: string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  const { data: categories = [] } = useSuspenseQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listCategories(supabase);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const { data: labels = [] } = useSuspenseQuery<Label[]>({
    queryKey: ["labels"],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listLabels(supabase);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const { data: tags = [] } = useSuspenseQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listTags(supabase);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.title.localeCompare(b.title));
    },
  });

  const { data: wallets = [] } = useSuspenseQuery<Wallet[]>({
    queryKey: ["wallets"],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listWallets(supabase);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const { data: preferences } = useSuspenseQuery<{ base_currency: string }>({
    queryKey: ["preferences"],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await supabase
        .from("user_preferences")
        .select("*")
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data || { base_currency: "USD" };
    },
  });

  const baseCurrency = preferences?.base_currency || "USD";

  // Get unique currencies from wallets
  const currencies = Array.from(new Set(wallets.map((w) => w.currency)));

  const { data: conversionRates = {} } = useSuspenseQuery<
    Record<string, CurrencyConversion>
  >({
    queryKey: ["conversionRates", currencies, baseCurrency],
    queryFn: () => fetchAllConversions(currencies, baseCurrency),
  });

  const value: SettingsContextType = {
    categories,
    labels,
    tags,
    wallets,
    conversionRates,
    baseCurrency,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useCategories = (
  key: keyof Category = "id",
): [Category[], Map<string, Category>] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useCategories must be used within a SettingsProvider");
  }

  const list = context.categories;
  const map = new Map(
    context.categories
      .concat(TRANSFER_CATEGORIES)
      .map((category) => [String(category[key]), category]),
  );

  return [list, map];
};

export const useLabels = (
  key: keyof Label = "id",
): [Label[], Map<string, Label>] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useLabels must be used within a SettingsProvider");
  }

  const list = context.labels;
  const map = new Map(
    context.labels.map((label) => [String(label[key]), label]),
  );

  return [list, map];
};

export const useTags = (key: keyof Tag = "id"): [Tag[], Map<string, Tag>] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useTags must be used within a SettingsProvider");
  }

  const list = context.tags;
  const map = new Map(context.tags.map((tag) => [String(tag[key]), tag]));

  return [list, map];
};

export const useWallets = (
  key: keyof Wallet = "id",
): [Wallet[], Map<string, Wallet>] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useWallets must be used within a SettingsProvider");
  }

  const list = context.wallets;
  const map = new Map(
    context.wallets.map((wallet) => [String(wallet[key]), wallet]),
  );

  return [list, map];
};

export const useCurrency = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a SettingsProvider");
  }

  return {
    conversionRates: context.conversionRates,
    baseCurrency: context.baseCurrency,
  };
};
