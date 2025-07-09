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
  date?: string,
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
    .eq("date", date ?? new Date().toISOString().split("T")[0])
    .single();

  console.log(cachedRate);

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
  const url = new URL(
    `https://api.currencyapi.com/v3/${date ? "historical" : "latest"}`,
  );
  url.searchParams.set("apikey", process.env.CURRENCY_API_TOKEN!);
  url.searchParams.set("base_currency", targetCurrency);
  url.searchParams.set("currencies", sourceCurrency);

  if (date) {
    url.searchParams.set("date", date);
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch currency data");
    }

    const data = await response.json();
    const rate = data.data[sourceCurrency]?.value;

    if (!rate) {
      throw new Error("Invalid currency data received");
    }

    // Update or insert the new rate
    const { error: upsertError } = await supabase
      .from("currency_conversions")
      .upsert(
        {
          source_currency: targetCurrency,
          target_currency: sourceCurrency,
          rate: rate,
          updated_at: new Date().toISOString(),
          date: date ?? new Date().toISOString(),
        },
        {
          onConflict: "source_currency,target_currency,date",
        },
      );

    if (upsertError) {
      console.log(upsertError);
      throw new Error("Failed to update cache");
    }

    return {
      rate,
      lastUpdated: new Date().toISOString(),
      source: "api",
    };
  } catch (error) {
    // If API fails, try to use cached value even if it's older than 24 hours
    if (cachedRate) {
      console.warn(
        `API failed, using cached rate for ${sourceCurrency}->${targetCurrency}:`,
        error,
      );
      return {
        rate: cachedRate.rate,
        lastUpdated: cachedRate.updated_at,
        source: "cache",
      };
    }

    // If no cached value exists, re-throw the error
    throw error;
  }
}

export async function fetchAllConversions({
  currencies,
  baseCurrency,
  date,
}: {
  currencies: string[];
  baseCurrency: string;
  date?: string;
}) {
  const conversions: Record<string, CurrencyConversion> = {};

  await Promise.all(
    currencies.map(async (currency) => {
      if (currency !== baseCurrency) {
        conversions[currency] = await fetchConversion(
          currency,
          baseCurrency,
          date,
        );
      }
    }),
  );

  return conversions;
}
