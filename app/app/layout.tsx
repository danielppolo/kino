import React from "react";

import Navbar from "./(components)/navbar";

import { SettingsProvider } from "@/contexts/settings-context";
import {
  listCategories,
  listLabels,
  listWallets,
} from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  const supabase = await createClient();

  const [categories, wallets, labels] = await Promise.all([
    listCategories(supabase),
    listWallets(supabase),
    listLabels(supabase),
  ]);

  if (categories.error) throw categories.error;
  if (wallets.error) throw wallets.error;
  if (labels.error) throw labels.error;

  return (
    <SettingsProvider
      categories={categories.data || []}
      wallets={wallets.data || []}
      labels={labels.data || []}
    >
      {children}
      <Navbar />
    </SettingsProvider>
  );
}
