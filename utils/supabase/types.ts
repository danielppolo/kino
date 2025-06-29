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
