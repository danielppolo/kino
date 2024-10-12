"use client";

import React, { createContext, ReactNode, useContext } from "react";

import { Category, Label, Wallet } from "@/utils/supabase/types";

interface SettingsContextType {
  categories: Category[];
  labels: Label[];
  wallets: Wallet[];
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

interface SettingsProviderProps {
  children: ReactNode;
  categories: Category[];
  labels: Label[];
  wallets: Wallet[];
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
  categories,
  labels,
  wallets,
}) => {
  const value = { categories, labels, wallets };

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
    context.categories.map((category) => [category[key], category]),
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
  const map = new Map(context.labels.map((label) => [label[key], label]));

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
  const map = new Map(context.wallets.map((wallet) => [wallet[key], wallet]));

  return [list, map];
};
