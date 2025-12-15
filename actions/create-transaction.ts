import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchConversion } from "@/utils/fetch-conversions-server";
import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/utils/supabase/database.types";

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

export const createTransaction = async (
  transaction: Transaction,
  supabaseClient?: SupabaseClient<Database>,
) => {
  try {
    const validatedData = TransactionSchema.safeParse(transaction);

    if (!validatedData.success) {
      return {
        success: false,
        error: validatedData.error.issues[0].message,
        data: null,
      };
    }

    const supabase = supabaseClient || (await createClient());

    const { amount, type, id, currency, date, wallet_id, ...rest } =
      validatedData.data;

    // Fetch user base currency preference
    // If using service role client, get user_id from wallet via user_wallets
    // Prefer an editor user if available
    let userId: string | null = null;
    if (supabaseClient) {
      // Using service role client, need to get user_id from wallet
      // Prefer an editor user, fallback to any user
      const { data: userWallet, error: userWalletError } = await supabase
        .from("user_wallets")
        .select("user_id")
        .eq("wallet_id", wallet_id)
        .eq("role", "editor")
        .limit(1)
        .maybeSingle();

      if (userWalletError) {
        return {
          success: false,
          error: `Failed to fetch user wallet: ${userWalletError.message}`,
          data: null,
        };
      }

      // If no editor found, try any user
      if (!userWallet) {
        const { data: anyUserWallet, error: anyUserWalletError } =
          await supabase
            .from("user_wallets")
            .select("user_id")
            .eq("wallet_id", wallet_id)
            .limit(1)
            .maybeSingle();

        if (anyUserWalletError) {
          return {
            success: false,
            error: `Failed to fetch user wallet: ${anyUserWalletError.message}`,
            data: null,
          };
        }

        userId = anyUserWallet?.user_id || null;
      } else {
        userId = userWallet.user_id;
      }
    }

    const { data: pref, error: prefError } = userId
      ? await supabase
          .from("user_preferences")
          .select("base_currency")
          .eq("user_id", userId)
          .maybeSingle()
      : await supabase
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
        wallet_id,
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
