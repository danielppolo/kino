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

export const useCategories = (): Category[] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useCategories must be used within a SettingsProvider");
  }
  return context.categories;
};

export const useLabels = (): Label[] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useLabels must be used within a SettingsProvider");
  }
  return context.labels;
};

export const useWallets = (): Wallet[] => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useWallets must be used within a SettingsProvider");
  }
  return context.wallets;
};
