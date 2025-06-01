import React from "react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { SettingsProvider } from "@/contexts/settings-context";
import { fetchAllConversions } from "@/utils/fetch-conversions";
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

  const [categories, wallets, labels, preferences] = await Promise.all([
    listCategories(supabase),
    listWallets(supabase),
    listLabels(supabase),
    supabase.from("user_preferences").select("*").single(),
  ]);

  if (categories.error) throw categories.error;
  if (wallets.error) throw wallets.error;
  if (labels.error) throw labels.error;
  if (preferences.error) throw preferences.error;

  const baseCurrency = preferences.data?.base_currency || "USD";

  // Get unique currencies from wallets
  const currencies = Array.from(
    new Set(wallets.data?.map((w) => w.currency) || []),
  );

  // Fetch all currency conversions
  const conversionRates = await fetchAllConversions(currencies, baseCurrency);

  return (
    <SidebarProvider>
      <SettingsProvider
        categories={categories.data || []}
        wallets={wallets.data || []}
        labels={labels.data || []}
        conversionRates={conversionRates}
        baseCurrency={baseCurrency}
      >
        {children}
      </SettingsProvider>
    </SidebarProvider>
  );
}
