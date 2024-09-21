import { Database } from "./database.types";

import { TypedSupabaseClient } from "@/utils/supabase/types";

interface Params {
  from?: string;
  to?: string;
  category_id?: string;
  subject_id?: string;
}

export const createTransaction = (
  client: TypedSupabaseClient,
  newTransaction: Database["public"]["Tables"]["transactions"]["Insert"],
) => {
  client.from("transactions").insert([newTransaction]);
};
