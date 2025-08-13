import { z } from "zod";

import { createClient } from "@/utils/supabase/client";
import { fetchConversion } from "@/utils/fetch-conversions-server";

const TransactionSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  type: z.enum(["expense", "income", "transfer"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().optional(),
  category_id: z.string().uuid(),
  label_id: z.string().uuid(),
  wallet_id: z.string().uuid(),
  currency: z.string(),
  tags: z.array(z.string().uuid()).optional(),
});

type Transaction = z.infer<typeof TransactionSchema>;

export const createTransaction = async (transaction: Transaction) => {
  try {
    const validatedData = TransactionSchema.safeParse(transaction);

    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0].message,
        data: null,
      };
    }

    const supabase = await createClient();

    const { amount, type, id, currency, date, ...rest } = validatedData.data;

    // Fetch user base currency preference
    const { data: pref, error: prefError } = await supabase
      .from("user_preferences")
      .select("base_currency")
      .maybeSingle();

    if (prefError) {
      return {
        success: false,
        error: `Failed to fetch user preferences: ${prefError.message}`,
        data: null,
      };
    }

    const baseCurrency = pref?.base_currency;

    // Fetch conversion rate to base currency only when needed
    let rate = 1;
    if (baseCurrency && currency !== baseCurrency) {
      try {
        const conversion = await fetchConversion({
          sourceCurrency: baseCurrency,
          targetCurrency: currency,
          date,
        });
        rate = conversion.rate;
      } catch (conversionError) {
        return {
          success: false,
          error: `Failed to fetch conversion rate: ${conversionError instanceof Error ? conversionError.message : "Unknown error"}`,
          data: null,
        };
      }
    }

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
        date,
        amount_cents: signedAmount,
        base_amount_cents: signedBaseAmount,
        conversion_rate_to_base: rate.toString(),
      })
      .select();

    if (error) {
      return {
        success: false,
        error: `Failed to create transaction: ${error.message}`,
        data: null,
      };
    }

    const transactionId = data?.[0]?.id ?? id;
    if (transactionId && validatedData.data.tags) {
      // Replace existing tags
      const { error: deleteError } = await supabase
        .from("transaction_tags")
        .delete()
        .eq("transaction_id", transactionId);

      if (deleteError) {
        return {
          success: false,
          error: `Failed to update transaction tags: ${deleteError.message}`,
          data: null,
        };
      }

      const rows = validatedData.data.tags.map((tagId) => ({
        transaction_id: transactionId,
        tag_id: tagId,
      }));

      if (rows.length) {
        const { error: insertError } = await supabase
          .from("transaction_tags")
          .upsert(rows);
        if (insertError) {
          return {
            success: false,
            error: `Failed to insert transaction tags: ${insertError.message}`,
            data: null,
          };
        }
      }
    }

    return {
      success: true,
      error: null,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      data: null,
    };
  }
};
