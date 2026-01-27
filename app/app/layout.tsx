import React from "react";

import { Providers } from "@/app/providers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SettingsProvider } from "@/contexts/settings-context";
import { fetchAllConversions } from "@/utils/fetch-conversions-server";
import { listWallets } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";
import { parseFeatureFlags, DEFAULT_FEATURE_FLAGS } from "@/utils/types/feature-flags";

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
  const featureFlags = preferences?.feature_flags
    ? parseFeatureFlags(preferences.feature_flags)
    : DEFAULT_FEATURE_FLAGS;

  // Fetch wallets to get currencies
  const walletsResult = await listWallets(supabase);
  const wallets = walletsResult.data || [];
  const currencies = Array.from(new Set(wallets.map((w) => w.currency)));

  // Fetch conversion rates on the server
  const conversionRates = await fetchAllConversions({
    baseCurrency,
    currencies,
  });

  return (
    <Providers>
      <SidebarProvider>
        <SettingsProvider
          initialConversionRates={conversionRates}
          initialBaseCurrency={baseCurrency}
          initialFeatureFlags={featureFlags}
        >
          {children}
        </SettingsProvider>
      </SidebarProvider>
    </Providers>
  );
}
