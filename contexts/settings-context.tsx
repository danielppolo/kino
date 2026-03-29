"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { TRANSFER_CATEGORIES } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import {
  listCategories,
  listLabels,
  listTags,
  listTransactionTemplates,
  listViews,
  listWallets,
} from "@/utils/supabase/queries";
import {
  Category,
  Label,
  Tag,
  TransactionTemplate,
  View,
  Wallet,
} from "@/utils/supabase/types";
import { FeatureFlags } from "@/utils/types/feature-flags";

export interface CurrencyConversion {
  rate: number;
  lastUpdated: string;
  source: "cache" | "api" | "direct";
}

interface SettingsContextType {
  categories: Category[];
  labels: Label[];
  tags: Tag[];
  views: View[];
  templates: TransactionTemplate[];
  wallets: Wallet[];
  conversionRates: Record<string, CurrencyConversion>;
  baseCurrency: string;
  featureFlags: FeatureFlags;
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
  workspaceId: string;
  initialConversionRates: Record<string, CurrencyConversion>;
  initialBaseCurrency: string;
  initialFeatureFlags: FeatureFlags;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
  workspaceId,
  initialConversionRates,
  initialBaseCurrency,
  initialFeatureFlags,
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
    queryKey: ["categories", workspaceId],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listCategories(supabase, workspaceId);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: labels = [] } = useSuspenseQuery<Label[]>({
    queryKey: ["labels", workspaceId],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listLabels(supabase, workspaceId);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: tags = [] } = useSuspenseQuery<Tag[]>({
    queryKey: ["tags", workspaceId],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listTags(supabase, workspaceId);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.title.localeCompare(b.title));
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: templates = [] } = useQuery<TransactionTemplate[]>({
    queryKey: ["transaction-templates", workspaceId],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listTransactionTemplates(supabase, workspaceId);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: views = [] } = useQuery<View[]>({
    queryKey: ["views", workspaceId],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listViews(supabase, workspaceId);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 1000 * 60 * 10,
  });

  const { data: wallets = [] } = useSuspenseQuery<Wallet[]>({
    queryKey: ["wallets", workspaceId],
    queryFn: async () => {
      const supabase = await createClient();
      const result = await listWallets(supabase, workspaceId);
      if (result.error) throw result.error;
      return (result.data || []).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 1000 * 60 * 10,
  });

  // Use conversion rates from WorkspaceProvider (passed as initialConversionRates)
  // No need to fetch them again here
  const value: SettingsContextType = {
    categories,
    labels,
    tags,
    views,
    templates,
    wallets,
    conversionRates: initialConversionRates,
    baseCurrency: initialBaseCurrency,
    featureFlags: initialFeatureFlags,
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
  const withTransfer = context.categories.concat(
    TRANSFER_CATEGORIES.map((c) => ({ ...c, workspace_id: "" })),
  );
  const map = new Map(
    withTransfer.map((category) => [String(category[key]), category]),
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

export const useFeatureFlags = (): FeatureFlags => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useFeatureFlags must be used within a SettingsProvider");
  }
  return context.featureFlags;
};
