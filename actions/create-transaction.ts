import { z } from "zod";

import { createClient } from "@/utils/supabase/client";

const TransactionSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  type: z.enum(["expense", "income", "transfer"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
  category_id: z.string().uuid(),
  label_id: z.string().uuid(),
  wallet_id: z.string().uuid(),
  currency: z.string(),
  tags: z.array(z.string()).optional(),
});

type Transaction = z.infer<typeof TransactionSchema>;

export const createTransaction = async (transaction: Transaction) => {
  const validatedData = TransactionSchema.safeParse(transaction);

  if (!validatedData.success) {
    throw new Error(validatedData.error.issues[0].message);
  }
  const supabase = await createClient();

  const { amount, type, id, ...rest } = validatedData.data;

  const { error, data } = await supabase
    .from("transactions")
    .upsert({
      id,
      ...rest,
      type,
      amount_cents: type === "expense" ? -amount * 100 : amount * 100,
    })
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return { data };
};
