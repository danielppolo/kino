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

export const useCategories = (): [Category[], Record<string, Category>] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useCategories must be used within a SettingsProvider");
  }

  const list = context.categories;
  const dict = context.categories.reduce(
    (acc, label) => {
      acc[label.id] = label;
      return acc;
    },
    {} as Record<string, Category>,
  );

  return [list, dict];
};

export const useLabels = (): [Label[], Record<string, Label>] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useLabels must be used within a SettingsProvider");
  }

  const list = context.labels;
  const dict = context.labels.reduce(
    (acc, label) => {
      acc[label.id] = label;
      return acc;
    },
    {} as Record<string, Label>,
  );

  return [list, dict];
};

export const useWallets = (): [Wallet[], Record<string, Wallet>] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useWallets must be used within a SettingsProvider");
  }

  const list = context.wallets;
  const dict = context.wallets.reduce(
    (acc, wallet) => {
      acc[wallet.id] = wallet;
      return acc;
    },
    {} as Record<string, Wallet>,
  );

  return [list, dict];
};
