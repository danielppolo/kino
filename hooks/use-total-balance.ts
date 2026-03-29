import { useQuery } from "@tanstack/react-query";

import {
  useCurrency,
  useSettings,
  useWallets,
} from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getWalletOwed } from "@/utils/supabase/queries";

export function useTotalBalance() {
  const [wallets] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();
  const { showOwedInBalance } = useSettings();

  const sortedWallets = wallets
    .filter((w) => w.visible)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Query owed amounts for all wallets (only when toggle is ON)
  const { data: owedByWallet = {} } = useQuery({
    queryKey: ["wallet-owed-amounts", wallets.map((w) => w.id)],
    queryFn: async () => {
      const supabase = await createClient();
      const results = await Promise.all(
        wallets.map(async (wallet) => {
          const { data } = await getWalletOwed(supabase, wallet.id);
          return [wallet.id, data ?? 0] as const;
        }),
      );
      return Object.fromEntries(results);
    },
    enabled: showOwedInBalance && wallets.length > 0,
    staleTime: 1000 * 15,
  });

  // Calculate total balance (with optional owed amounts)
  const totalBalance = sortedWallets.reduce((total, wallet) => {
    const balance = wallet.balance_cents ?? 0;
    const owed = showOwedInBalance ? (owedByWallet[wallet.id] ?? 0) : 0;
    // Owed is negative, so we need to subtract it from the balance
    const combined = balance + owed * -1;

    if (wallet.currency === baseCurrency) {
      return total + combined;
    }
    const rate = conversionRates[wallet.currency]?.rate ?? 1;
    return total + Math.round(combined * rate);
  }, 0);


  // Calculate total owed across all wallets
  const totalOwed = sortedWallets.reduce((total, wallet) => {
    const owed = owedByWallet[wallet.id] ?? 0;

    if (wallet.currency === baseCurrency) {
      return total + owed;
    }
    const rate = conversionRates[wallet.currency]?.rate ?? 1;
    return total + Math.round(owed * rate);
  }, 0);

  // Extend wallet objects with owed_cents
  const walletsWithOwed = sortedWallets.map((wallet) => ({
    ...wallet,
    owed_cents: owedByWallet[wallet.id] ?? 0,
  }));

  // Group wallets by currency
  const walletsByCurrency = walletsWithOwed.reduce(
    (acc, wallet) => {
      if (!acc[wallet.currency]) acc[wallet.currency] = [];
      acc[wallet.currency].push(wallet);
      return acc;
    },
    {} as Record<string, typeof walletsWithOwed>,
  );

  return {
    totalBalance,
    totalOwed,
    walletsByCurrency,
    sortedWallets: walletsWithOwed,
    baseCurrency,
    showOwedInBalance,
  };
}
