import { z } from "zod";

import { createClient } from "@/utils/supabase/client";
import { fetchConversion } from "@/utils/fetch-conversions-server";

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
  tags: z.array(z.string().uuid()).optional(),
});

type Transaction = z.infer<typeof TransactionSchema>;

export const createTransaction = async (transaction: Transaction) => {
  const validatedData = TransactionSchema.safeParse(transaction);

  if (!validatedData.success) {
    throw new Error(validatedData.error.issues[0].message);
  }
  const supabase = await createClient();

  const { amount, type, id, currency, ...rest } = validatedData.data;

  // Fetch user base currency preference
  const { data: pref } = await supabase
    .from("user_preferences")
    .select("base_currency")
    .maybeSingle();
  const baseCurrency = pref?.base_currency || "USD";

  // Fetch conversion rate to base currency
  const conversion = await fetchConversion({
    sourceCurrency: currency,
    targetCurrency: baseCurrency,
  });
  const rate = conversion.rate;

  const signedAmount =
    type === "expense" ? -Math.round(amount * 100) : Math.round(amount * 100);
  const baseAmount = Math.round(amount * 100 * rate);
  const signedBaseAmount = type === "expense" ? -baseAmount : baseAmount;

  const { error, data } = await supabase
    .from("transactions")
    .upsert({
      id,
      ...rest,
      currency,
      type,
      amount_cents: signedAmount,
      base_amount_cents: signedBaseAmount,
      conversion_rate_to_base: rate.toString(),
    })
    .select();

  if (error) {
    throw new Error(error.message);
  }

  const transactionId = data?.[0]?.id ?? id;
  if (transactionId && validatedData.data.tags) {
    // Replace existing tags
    await supabase
      .from("transaction_tags")
      .delete()
      .eq("transaction_id", transactionId);

    const rows = validatedData.data.tags.map((tagId) => ({
      transaction_id: transactionId,
      tag_id: tagId,
    }));
    if (rows.length) {
      await supabase.from("transaction_tags").upsert(rows);
    }
  }

  return { data };
};
