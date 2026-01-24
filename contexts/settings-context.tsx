"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { TRANSFER_CATEGORIES } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import {
  listBills,
  listCategories,
  listLabels,
  listTags,
  listViews,
  listWallets,
  listTransactionTemplates,
} from "@/utils/supabase/queries";
import {
  Bill,
  Category,
  Label,
  Tag,
  Wallet,
  View,
  TransactionTemplate,
} from "@/utils/supabase/types";

export interface CurrencyConversion {
  rate: number;
  lastUpdated: string;
  source: "cache" | "api" | "direct";
}

interface SettingsContextType {
  bills: Bill[];
  categories: Category[];
  labels: Label[];
  tags: Tag[];
  views: View[];
  templates: TransactionTemplate[];
  wallets: Wallet[];
  conversionRates: Record<string, CurrencyConversion>;
  baseCurrency: string;
  moneyVisible: boolean;
  toggleMoneyVisibility: () => void;
  showOwedInBalance: boolean;
  toggleShowOwedInBalance: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

interface SettingsProviderProps {
  children: ReactNode;
  initialConversionRates: Record<string, CurrencyConversion>;
  initialBaseCurrency: string;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
  initialConversionRates,
  initialBaseCurrency,
}) => {
  const [moneyVisible, setMoneyVisible] = useState(true);
  const [showOwedInBalance, setShowOwedInBalance] = useState(false);

  const toggleMoneyVisibility = () => {
    setMoneyVisible((prev) => !prev);
  };

  const toggleShowOwedInBalance = () => {
    setShowOwedInBalance((prev) => !prev);
  };

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

  const { data: templates = [] } = useQuery<TransactionTemplate[]>({
    queryKey: ["transaction-templates"],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listTransactionTemplates(supabase);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const { data: views = [] } = useQuery<View[]>({
    queryKey: ["views"],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listViews(supabase);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.name.localeCompare(b.name));
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

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ["bills"],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listBills(supabase);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) =>
        a.due_date.localeCompare(b.due_date),
      );
    },
  });

  const value: SettingsContextType = {
    bills,
    categories,
    labels,
    tags,
    views,
    templates,
    wallets,
    conversionRates: initialConversionRates,
    baseCurrency: initialBaseCurrency,
    moneyVisible,
    toggleMoneyVisibility,
    showOwedInBalance,
    toggleShowOwedInBalance,
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

export const useViews = (
  key: keyof View = "id",
): [View[], Map<string, View>] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useViews must be used within a SettingsProvider");
  }

  const list = context.views;
  const map = new Map(context.views.map((view) => [String(view[key]), view]));
  return [list, map];
};

export const useTemplates = (
  key: keyof TransactionTemplate = "id",
): [TransactionTemplate[], Map<string, TransactionTemplate>] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useTemplates must be used within a SettingsProvider");
  }

  const list = context.templates;
  const map = new Map(context.templates.map((t) => [String(t[key]), t]));

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

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
};

export const useBills = (
  key: keyof Bill = "id",
): [Bill[], Map<string, Bill>] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useBills must be used within a SettingsProvider");
  }

  const list = context.bills;
  const map = new Map(context.bills.map((bill) => [String(bill[key]), bill]));

  return [list, map];
};
