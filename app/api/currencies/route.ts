import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

const CACHE_DURATION_HOURS = 24;

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceCurrency = searchParams.get("source")?.toUpperCase() || "USD";
    const targetCurrency = searchParams.get("target")?.toUpperCase();

    if (!targetCurrency) {
      return NextResponse.json(
        { error: "Target currency parameter is required" },
        { status: 400 },
      );
    }

    // If source and target are the same, return 1 as the rate
    if (sourceCurrency === targetCurrency) {
      return NextResponse.json({
        rate: 1,
        lastUpdated: new Date().toISOString(),
        source: "direct",
      });
    }

    // Check for cached record
    const { data: cachedRate, error: cacheError } = await supabase
      .from("currency_conversions")
      .select("*")
      .eq("source_currency", sourceCurrency)
      .eq("target_currency", targetCurrency)
      .single();

    if (cacheError && cacheError.code !== "PGRST116") {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const now = new Date();
    const isCacheValid =
      cachedRate &&
      now.getTime() - new Date(cachedRate.updated_at).getTime() <
        CACHE_DURATION_HOURS * 60 * 60 * 1000;

    if (isCacheValid) {
      return NextResponse.json({
        rate: cachedRate.rate,
        lastUpdated: cachedRate.updated_at,
        source: "cache",
      });
    }

    // Fetch fresh data from API
    const response = await fetch(
      `https://api.currencyapi.com/v3/latest?apikey=${process.env.CURRENCY_API_TOKEN}&currencies=${targetCurrency}`,
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch currency data" },
        { status: response.status },
      );
    }

    const data = await response.json();
    const rate = data.data[targetCurrency]?.value;

    if (!rate) {
      return NextResponse.json(
        { error: "Invalid currency data received" },
        { status: 500 },
      );
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
      return NextResponse.json(
        { error: "Failed to update cache" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      rate,
      lastUpdated: new Date().toISOString(),
      source: "api",
    });
  } catch (error) {
    console.error("Currency conversion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
