import { useCurrency, useWallets } from "@/contexts/settings-context";

export function useTotalBalance() {
  const [wallets] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  const sortedWallets = wallets
    .filter((w) => w.visible)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Calculate total balance in base currency
  const totalBalance = sortedWallets.reduce((total, wallet) => {
    const balance = wallet.balance_cents ?? 0;
    if (wallet.currency === baseCurrency) {
      return total + balance;
    }
    const rate = conversionRates[wallet.currency]?.rate ?? 1;
    return total + Math.round(balance * rate);
  }, 0);

  // Group wallets by currency
  const walletsByCurrency = sortedWallets.reduce(
    (acc, wallet) => {
      if (!acc[wallet.currency]) acc[wallet.currency] = [];
      acc[wallet.currency].push(wallet);
      return acc;
    },
    {} as Record<string, typeof wallets>,
  );

  return {
    totalBalance,
    walletsByCurrency,
    sortedWallets,
    baseCurrency,
  };
}
