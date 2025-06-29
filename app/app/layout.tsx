import React from "react";

import { Providers } from "@/app/providers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SettingsProvider } from "@/contexts/settings-context";
import { fetchAllConversions } from "@/utils/fetch-conversions-server";
import { listWallets } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

// Force dynamic rendering since this layout uses user-specific data
export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  const supabase = await createClient();

  // Fetch user preferences
  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("*")
    .maybeSingle();

  const baseCurrency = preferences?.base_currency || "USD";

  // Fetch wallets to get currencies
  const walletsResult = await listWallets(supabase);
  const wallets = walletsResult.data || [];
  const currencies = Array.from(new Set(wallets.map((w) => w.currency)));

  // Fetch conversion rates on the server
  const conversionRates = await fetchAllConversions(currencies, baseCurrency);

  return (
    <Providers>
      <SidebarProvider>
        <SettingsProvider
          initialConversionRates={conversionRates}
          initialBaseCurrency={baseCurrency}
        >
          {children}
        </SettingsProvider>
      </SidebarProvider>
    </Providers>
  );
}
