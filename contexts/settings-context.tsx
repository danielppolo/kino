"use client";

import React, { createContext, ReactNode, useContext } from "react";

import { TRANSFER_CATEGORIES } from "@/utils/constants";
import { Category, Label, Wallet } from "@/utils/supabase/types";

export interface CurrencyConversion {
  rate: number;
  lastUpdated: string;
  source: "cache" | "api" | "direct";
}

interface SettingsContextType {
  categories: Category[];
  labels: Label[];
  wallets: Wallet[];
  conversionRates: Record<string, CurrencyConversion>;
  baseCurrency: string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

interface SettingsProviderProps {
  children: ReactNode;
  categories: Category[];
  labels: Label[];
  wallets: Wallet[];
  conversionRates: Record<string, CurrencyConversion>;
  baseCurrency: string;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
  categories,
  labels,
  wallets,
  conversionRates,
  baseCurrency,
}) => {
  const value = { categories, labels, wallets, conversionRates, baseCurrency };

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
