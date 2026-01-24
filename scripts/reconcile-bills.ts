#!/usr/bin/env node

import { format } from "date-fns";
import { config } from "dotenv";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../utils/supabase/database.types";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Types
type BillPayment = Database["public"]["Tables"]["bill_payments"]["Insert"];

// Extract YYYY-MM from description using regex
function extractYearMonthFromDescription(
  description: string | null,
): string | null {
  if (!description) return null;
  const match = description.match(/\d{4}-\d{2}/);
  return match ? match[0] : null;
}

// Extract YYYY-MM from date string (for transaction dates)
function extractYearMonthFromDate(date: string | Date | null): string | null {
  if (!date) return null;
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "yyyy-MM");
  } catch {
    return null;
  }
}

// Extract YYYY-MM from bill due_date by trimming last 3 characters (-DD)
function extractYearMonthFromBillDueDate(
  dueDate: string | null,
): string | null {
  if (!dueDate || dueDate.length < 7) return null;
  // Take first 7 characters (YYYY-MM) by trimming last 3 characters (-DD)
  return dueDate.slice(0, -3);
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Main reconciliation function
async function reconcileBillsAndTransactions(walletId: string): Promise<void> {
  // Validate wallet ID
  if (!isValidUUID(walletId)) {
    throw new Error(`Invalid wallet ID format: ${walletId}`);
  }

  // Initialize Supabase client with service role key (bypasses RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

  console.log(`\n🔍 Starting reconciliation for wallet: ${walletId}\n`);

  // Verify wallet exists
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("id, name, currency")
    .eq("id", walletId)
    .single();

  if (walletError || !wallet) {
    throw new Error(`Wallet not found: ${walletId}`);
  }

  console.log(`✓ Wallet found: ${wallet.name} (${wallet.currency})\n`);

  // Fetch all bills for the wallet, ordered by due_date ascending
  console.log("📋 Fetching bills...");
  const { data: bills, error: billsError } = await supabase
    .from("bills")
    .select("*")
    .eq("wallet_id", walletId)
    .order("due_date", { ascending: true });

  if (billsError) {
    throw new Error(`Failed to fetch bills: ${billsError.message}`);
  }

  if (!bills || bills.length === 0) {
    console.log("⚠️  No bills found for this wallet.");
    return;
  }

  console.log(`✓ Found ${bills.length} bills\n`);

  // Fetch all income transactions for the wallet
  console.log("💳 Fetching income transactions...");
  const { data: transactions, error: transactionsError } = await supabase
    .from("transaction_list")
    .select("*")
    .eq("wallet_id", walletId)
    .eq("type", "income")
    .order("date", { ascending: false });

  if (transactionsError) {
    throw new Error(
      `Failed to fetch transactions: ${transactionsError.message}`,
    );
  }

  if (!transactions || transactions.length === 0) {
    console.log("⚠️  No income transactions found for this wallet.");
    return;
  }

  // Filter transactions to only those with valid IDs and matching currency
  const validTransactions = transactions.filter(
    (t) => t.id && t.currency && bills.some((b) => b.currency === t.currency),
  );

  console.log(`✓ Found ${validTransactions.length} income transactions\n`);

  // Track matched transactions and bills
  const matchedTransactionIds = new Set<string>();
  const matchedBillIds = new Set<string>();
  const newPayments: BillPayment[] = [];

  // Phase 1: Match transactions with YYYY-MM in description to bills
  console.log("📅 Phase 1: Matching by YYYY-MM in description...");
  let phase1Matches = 0;

  for (const transaction of validTransactions) {
    if (!transaction.id || matchedTransactionIds.has(transaction.id)) {
      continue;
    }

    const yearMonth = extractYearMonthFromDescription(transaction.description);
    if (!yearMonth) {
      continue;
    }

    // Find first unmatched bill with matching YYYY-MM in due_date and same currency
    const matchingBill = bills.find(
      (bill) =>
        !matchedBillIds.has(bill.id) &&
        extractYearMonthFromBillDueDate(bill.due_date) === yearMonth &&
        bill.currency === transaction.currency,
    );

    if (matchingBill) {
      // Skip if transaction amount is greater than bill amount
      if (
        transaction.amount_cents &&
        Math.abs(transaction.amount_cents) > matchingBill.amount_cents
      ) {
        continue;
      }

      newPayments.push({
        bill_id: matchingBill.id,
        transaction_id: transaction.id,
      });
      matchedTransactionIds.add(transaction.id);
      matchedBillIds.add(matchingBill.id);
      phase1Matches++;
    }
  }

  console.log(`✓ Phase 1: ${phase1Matches} matches found\n`);

  // Phase 2: Match transactions without description using created_at YYYY-MM
  console.log("📅 Phase 2: Matching by created_at YYYY-MM (no description)...");
  let phase2Matches = 0;

  for (const transaction of validTransactions) {
    if (
      !transaction.id ||
      matchedTransactionIds.has(transaction.id) ||
      transaction.description
    ) {
      continue;
    }

    const yearMonth = extractYearMonthFromDate(transaction.created_at);
    if (!yearMonth) {
      continue;
    }

    // Find first unmatched bill with matching YYYY-MM in due_date and same currency
    const matchingBill = bills.find(
      (bill) =>
        !matchedBillIds.has(bill.id) &&
        extractYearMonthFromBillDueDate(bill.due_date) === yearMonth &&
        bill.currency === transaction.currency,
    );

    if (matchingBill) {
      // Skip if transaction amount is greater than bill amount
      if (
        transaction.amount_cents &&
        Math.abs(transaction.amount_cents) > matchingBill.amount_cents
      ) {
        continue;
      }

      newPayments.push({
        bill_id: matchingBill.id,
        transaction_id: transaction.id,
      });
      matchedTransactionIds.add(transaction.id);
      matchedBillIds.add(matchingBill.id);
      phase2Matches++;
    }
  }

  console.log(`✓ Phase 2: ${phase2Matches} matches found\n`);

  // Phase 3: Match remaining transactions to bills by amount (oldest bills first)
  console.log("💰 Phase 3: Matching by amount (oldest bills first)...");
  let phase3Matches = 0;

  // Sort remaining unmatched bills by due_date ascending (oldest first)
  const unmatchedBills = bills
    .filter((bill) => !matchedBillIds.has(bill.id))
    .sort((a, b) => {
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return dateA - dateB;
    });

  // Sort remaining unmatched transactions by date ascending (oldest first)
  // to match oldest transactions against oldest bills
  const unmatchedTransactions = validTransactions
    .filter(
      (t) =>
        t.id &&
        !matchedTransactionIds.has(t.id) &&
        t.amount_cents !== null &&
        t.amount_cents !== undefined,
    )
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

  for (const transaction of unmatchedTransactions) {
    if (!transaction.id || !transaction.amount_cents) {
      continue;
    }

    // Store amount_cents after null check for type safety
    const transactionAmount = Math.abs(transaction.amount_cents);

    // Find first unmatched bill with matching amount_cents and same currency
    // (bills are already sorted oldest first, so this matches oldest bills first)
    const matchingBill = unmatchedBills.find(
      (bill) =>
        !matchedBillIds.has(bill.id) &&
        bill.amount_cents === transactionAmount &&
        bill.currency === transaction.currency,
    );

    if (matchingBill) {
      // Skip if transaction amount is greater than bill amount
      // (Note: In Phase 3 we match exact amounts, but check for consistency)
      if (transactionAmount > matchingBill.amount_cents) {
        continue;
      }

      newPayments.push({
        bill_id: matchingBill.id,
        transaction_id: transaction.id,
      });
      matchedTransactionIds.add(transaction.id);
      matchedBillIds.add(matchingBill.id);
      phase3Matches++;
    }
  }

  console.log(`✓ Phase 3: ${phase3Matches} matches found\n`);

  // Insert new bill_payments in batches
  if (newPayments.length === 0) {
    console.log("ℹ️  No new bill payments to create.\n");
    return;
  }

  console.log(`💾 Creating ${newPayments.length} bill payment(s)...`);

  const BATCH_SIZE = 100;
  let insertedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < newPayments.length; i += BATCH_SIZE) {
    const batch = newPayments.slice(i, i + BATCH_SIZE);

    const { error } = await supabase.from("bill_payments").insert(batch);

    if (error) {
      // Handle unique constraint violations gracefully
      if (error.code === "23505") {
        // Unique constraint violation - some links already exist
        console.log(
          `⚠️  Some bill payments in batch ${Math.floor(i / BATCH_SIZE) + 1} already exist (skipped)`,
        );
        errorCount += batch.length;
      } else {
        throw new Error(`Failed to insert bill payments: ${error.message}`);
      }
    } else {
      insertedCount += batch.length;
    }
  }

  // Summary report
  console.log("\n" + "=".repeat(60));
  console.log("📊 RECONCILIATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total bills: ${bills.length}`);
  console.log(`Total transactions: ${validTransactions.length}`);
  console.log(`\nPhase 1 matches (description YYYY-MM): ${phase1Matches}`);
  console.log(`Phase 2 matches (created_at YYYY-MM): ${phase2Matches}`);
  console.log(`Phase 3 matches (amount matching): ${phase3Matches}`);
  console.log(`\nNew bill payments created: ${insertedCount}`);
  if (errorCount > 0) {
    console.log(`Skipped (already exists): ${errorCount}`);
  }
  console.log(
    `\nUnmatched transactions: ${validTransactions.length - matchedTransactionIds.size}`,
  );
  console.log(`Unmatched bills: ${bills.length - matchedBillIds.size}`);
  console.log("=".repeat(60) + "\n");
}

// Main execution
async function main() {
  const walletId = process.argv[2];

  if (!walletId) {
    console.error("Usage: ts-node scripts/reconcile-bills.ts <wallet-id>");
    process.exit(1);
  }

  try {
    await reconcileBillsAndTransactions(walletId);
    console.log("✅ Reconciliation completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Error during reconciliation:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
