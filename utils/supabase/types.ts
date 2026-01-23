import { SupabaseClient } from "@supabase/supabase-js";

import { Database } from "./database.types";

export type TypedSupabaseClient = SupabaseClient<Database>;
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionList =
  Database["public"]["Views"]["transaction_list"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Label = Database["public"]["Tables"]["labels"]["Row"];
export type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type View = Database["public"]["Tables"]["views"]["Row"];
export type TransactionTemplate =
  Database["public"]["Tables"]["transaction_templates"]["Row"];
export type Bill = Database["public"]["Tables"]["bills"]["Row"];
export type BillPayment = Database["public"]["Tables"]["bill_payments"]["Row"];

export interface BillWithPayments extends Bill {
  payments: Array<{
    id: string;
    transaction: TransactionList;
  }>;
  paid_amount_cents: number;
  payment_percentage: number;
}

export interface RecurringTransaction {
  id: string;
  wallet_id: string;
  category_id: string;
  label_id?: string | null;
  description?: string | null;
  amount_cents: number;
  currency: string;
  interval_type: string;
  start_date: string;
  end_date?: string | null;
  next_run_date?: string | null;
  tags?: string[] | null;
  categories?: {
    id: string;
    name: string;
    type: string;
    icon: string;
  } | null;
}
