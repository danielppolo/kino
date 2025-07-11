import { NextRequest, NextResponse } from "next/server";

import { fetchAllConversions } from "@/utils/fetch-conversions-server";
import { fetchConversion } from "@/utils/fetch-conversions-server";
import { calculateNextRunDate } from "@/utils/recurring-transaction";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  // Protect from calls not being a cron job
  if (
    request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    dailyConversions: null as any,
    runRecurring: null as any,
    errors: [] as string[],
  };

  try {
    // Task 1: Daily Conversions
    try {
      const conversions = await fetchAllConversions({
        currencies: ["EUR", "USD"],
        baseCurrency: "MXN",
        date: new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      });

      results.dailyConversions = {
        success: true,
        conversions,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Daily conversions error:", error);
      results.errors.push(`Daily conversions failed: ${error}`);
    }

    // Task 2: Run Recurring Transactions
    try {
      const supabase = await createClient();

      const { data: recurrences, error } = await supabase
        .from("recurring_transactions")
        .select("*");

      if (error) {
        throw new Error(error.message);
      }

      const today = new Date();

      for (const r of recurrences || []) {
        const runDate = r.next_run_date || r.start_date;
        if (!runDate) continue;

        const endDate = r.end_date ? new Date(r.end_date) : null;
        let current = new Date(runDate);

        while (current <= today && (!endDate || current <= endDate)) {
          const dateStr = current.toISOString().split("T")[0];

          // Fetch base currency for wallet owner
          const { data: userWallet } = await supabase
            .from("user_wallets")
            .select("user_id")
            .eq("wallet_id", r.wallet_id)
            .maybeSingle();
          const userId = userWallet?.user_id;
          const { data: pref } = userId
            ? await supabase
                .from("user_preferences")
                .select("base_currency")
                .eq("user_id", userId)
                .maybeSingle()
            : { data: null };
          const baseCurrency = pref?.base_currency;

          const conversion = await fetchConversion({
            sourceCurrency: r.currency,
            targetCurrency: baseCurrency,
            date: dateStr,
          });
          const rate = conversion.rate;

          await supabase.from("transactions").insert({
            wallet_id: r.wallet_id,
            category_id: r.category_id,
            label_id: r.label_id,
            description: r.description,
            amount_cents: r.amount_cents,
            currency: r.currency,
            type: r.type,
            date: dateStr,
            tags: r.tags,
            base_amount_cents: Math.round(r.amount_cents * rate),
            conversion_rate_to_base: rate.toString(),
          });

          // Update next_run_date for next iteration
          current = calculateNextRunDate(current, r.interval_type);
        }

        await supabase
          .from("recurring_transactions")
          .update({ next_run_date: current.toISOString().split("T")[0] })
          .eq("id", r.id);
      }

      results.runRecurring = {
        success: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Run recurring error:", error);
      results.errors.push(`Run recurring failed: ${error}`);
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Daily tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
