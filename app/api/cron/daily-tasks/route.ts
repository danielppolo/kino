import { NextRequest, NextResponse } from "next/server";

import { processRecurringTransactions } from "@/actions/process-recurring-transactions";
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
    runRecurringBills: null as unknown,
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
      results.runRecurring = await processRecurringTransactions();
    } catch (error) {
      console.error("Run recurring error:", error);
      results.errors.push(`Run recurring failed: ${error}`);
    }

    // Task 3: Process Recurring Bills
    try {
      const supabase = await createClient();

      // Fetch all recurrent bills where next_due_date <= today
      const today = new Date().toISOString().split("T")[0];
      const { data: recurrentBills, error: billsError } = await supabase
        .from("recurrent_bills")
        .select("*")
        .lte("next_due_date", today);

      if (billsError) {
        throw new Error(billsError.message);
      }

      let billsCreated = 0;
      for (const recurrentBill of recurrentBills || []) {
        // Check if end_date has passed
        if (recurrentBill.end_date) {
          const endDate = new Date(recurrentBill.end_date);
          const todayDate = new Date(today);
          if (endDate < todayDate) {
            continue; // Skip if end date has passed
          }
        }

        if (!recurrentBill.next_due_date) {
          continue; // Skip if no next_due_date set
        }

        // Calculate the next due date
        const currentDueDate = new Date(recurrentBill.next_due_date);
        const nextDueDate = calculateNextRunDate(
          currentDueDate,
          recurrentBill.interval_type,
        );
        const nextDueDateStr = nextDueDate.toISOString().split("T")[0];

        // Create a new bill instance for the current period
        const { error: insertError } = await supabase.from("bills").insert({
          wallet_id: recurrentBill.wallet_id,
          description: recurrentBill.description,
          amount_cents: recurrentBill.amount_cents,
          currency: recurrentBill.currency,
          due_date: recurrentBill.next_due_date,
          recurrent_bill_id: recurrentBill.id, // Link to the parent recurrent bill
        });

        if (insertError) {
          console.error(
            `Failed to create bill instance: ${insertError.message}`,
          );
          continue;
        }

        // Update the recurrent bill's next_due_date to the next occurrence
        const { error: updateError } = await supabase
          .from("recurrent_bills")
          .update({ next_due_date: nextDueDateStr })
          .eq("id", recurrentBill.id);

        if (updateError) {
          console.error(
            `Failed to update recurrent bill: ${updateError.message}`,
          );
        }

        billsCreated++;
      }

      results.runRecurringBills = {
        success: true,
        billsCreated,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Run recurring bills error:", error);
      results.errors.push(`Run recurring bills failed: ${error}`);
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
