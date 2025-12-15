import { NextRequest, NextResponse } from "next/server";

import { createTransaction } from "@/actions/create-transaction";
import { fetchAllConversions } from "@/utils/fetch-conversions-server";
import { calculateNextRunDate } from "@/utils/recurring-transaction";
import { createClient } from "@/utils/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handle(request: NextRequest) {
  // Protect from calls not being a cron job
  if (
    request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    dailyConversions: null as unknown,
    runRecurring: null as unknown,
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

          const result = await createTransaction(
            {
              amount: r.amount_cents / 100,
              type: r.type,
              date: dateStr,
              description: r.description,
              category_id: r.category_id,
              label_id: r.label_id,
              wallet_id: r.wallet_id,
              currency: r.currency,
              tags: r.tags,
            },
            supabase,
          );

          if (!result.success) {
            throw new Error(result.error ?? "Failed to create transaction");
          }

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

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
