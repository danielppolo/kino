import { Wallet } from "@/utils/supabase/types";

export interface CurrencyConversion {
  rate: number;
  lastUpdated: string;
  source: "cache" | "api" | "direct";
}

/**
 * Converts an amount from one currency to another using conversion rates
 */
export function convertCurrency(
  amountCents: number,
  fromCurrency: string,
  toCurrency: string,
  conversionRates: Record<string, { rate: number } | CurrencyConversion>,
): number {
  if (fromCurrency === toCurrency) {
    return amountCents;
  }

  const rate = conversionRates[fromCurrency]?.rate ?? 1;
  return Math.round(amountCents * rate);
}

/**
 * Converts amounts from multiple currencies to a base currency
 * Used for aggregating data across different wallets/currencies
 */
export function convertToBaseCurrency(
  data: Array<{
    amount_cents: number;
    wallet_id: string | null;
    [key: string]: any;
  }>,
  conversionRates: Record<string, { rate: number } | CurrencyConversion>,
  baseCurrency: string,
  walletMap: Map<string, Wallet>,
): Array<{
  amount_cents: number;
  wallet_id: string | null;
  [key: string]: any;
}> {
  return data.map((item) => {
    if (!item.wallet_id) return item;

    const wallet = walletMap.get(item.wallet_id);
    if (!wallet) return item;

    const convertedAmount = convertCurrency(
      item.amount_cents,
      wallet.currency,
      baseCurrency,
      conversionRates,
    );

    return {
      ...item,
      amount_cents: convertedAmount,
    };
  });
}

/**
 * Aggregates data by a specific key (like label_id) and converts to base currency
 * Used for pie charts and other aggregated visualizations
 */
export function aggregateByKeyWithCurrencyConversion<
  T extends {
    wallet_id: string | null;
    amount_cents: number;
    [key: string]: any;
  },
>(
  data: T[],
  keyField: keyof T,
  conversionRates: Record<string, { rate: number } | CurrencyConversion>,
  baseCurrency: string,
  walletMap: Map<string, Wallet>,
): Record<string, { total: number; count: number; items: T[] }> {
  const aggregated: Record<
    string,
    { total: number; count: number; items: T[] }
  > = {};

  data.forEach((item) => {
    if (!item.wallet_id) return;

    const wallet = walletMap.get(item.wallet_id);
    if (!wallet) return;

    const key = String(item[keyField]);

    const convertedAmount = convertCurrency(
      item.amount_cents,
      wallet.currency,
      baseCurrency,
      conversionRates,
    );
    // if (item.label_id === "1ccf953e-6967-4a82-a28e-641deadf3963") {
    //   console.log(
    //     `${item.month} ${item.amount_cents} ${wallet.currency}, ${convertedAmount} ${baseCurrency}`,
    //   );
    // }

    if (!aggregated[key]) {
      aggregated[key] = { total: 0, count: 0, items: [] };
    }

    aggregated[key].total += convertedAmount;
    aggregated[key].count += 1;
    aggregated[key].items.push({
      ...item,
      amount_cents: convertedAmount,
    });
  });

  return aggregated;
}
