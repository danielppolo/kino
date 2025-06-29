"use server";

import { createClient } from "@/utils/supabase/server";

export interface CurrencyConversion {
  rate: number;
  lastUpdated: string;
  source: "cache" | "api" | "direct";
}

export async function fetchConversion(
  sourceCurrency: string,
  targetCurrency: string,
): Promise<CurrencyConversion> {
  if (sourceCurrency === targetCurrency) {
    return {
      rate: 1,
      lastUpdated: new Date().toISOString(),
      source: "direct",
    };
  }

  const supabase = await createClient();

  // Check for cached record
  const { data: cachedRate, error: cacheError } = await supabase
    .from("currency_conversions")
    .select("*")
    .eq("source_currency", sourceCurrency)
    .eq("target_currency", targetCurrency)
    .single();

  if (!cacheError && cachedRate) {
    const now = new Date();
    const lastUpdated = new Date(cachedRate.updated_at);
    const hoursSinceUpdate =
      (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

    if (hoursSinceUpdate < 24) {
      return {
        rate: cachedRate.rate,
        lastUpdated: cachedRate.updated_at,
        source: "cache",
      };
    }
  }

  // Fetch fresh data from API
  const response = await fetch(
    `https://api.currencyapi.com/v3/latest?apikey=${process.env.CURRENCY_API_TOKEN}&currencies=${targetCurrency}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch currency data");
  }

  const data = await response.json();
  const rate = data.data[targetCurrency]?.value;

  if (!rate) {
    throw new Error("Invalid currency data received");
  }

  // Update or insert the new rate
  const { error: upsertError } = await supabase
    .from("currency_conversions")
    .upsert(
      {
        source_currency: sourceCurrency,
        target_currency: targetCurrency,
        rate: rate,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "source_currency,target_currency",
      },
    );

  if (upsertError) {
    throw new Error("Failed to update cache");
  }

  return {
    rate,
    lastUpdated: new Date().toISOString(),
    source: "api",
  };
}

export async function fetchAllConversions(
  currencies: string[],
  baseCurrency: string,
) {
  const conversions: Record<string, CurrencyConversion> = {};

  await Promise.all(
    currencies.map(async (currency) => {
      if (currency !== baseCurrency) {
        conversions[currency] = await fetchConversion(currency, baseCurrency);
      }
    }),
  );

  return conversions;
}
