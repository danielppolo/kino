import { z } from "zod";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchConversion } from "@/utils/fetch-conversions-server";
import { createClient } from "@/utils/supabase/client";
import type { Database } from "@/utils/supabase/database.types";

const TransactionSchema = z.object({
  id: z.string().uuid().optional(),
  amount: z.coerce.number(),
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

    // Fetch workspace base currency from wallet
    // First, get the workspace_id from the wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("workspace_id")
      .eq("id", wallet_id)
      .maybeSingle();

    if (walletError) {
      return {
        success: false,
        error: `Failed to fetch wallet: ${walletError.message}`,
        data: null,
      };
    }

    if (!wallet || !wallet.workspace_id) {
      return {
        success: false,
        error: `Wallet not found or has no associated workspace`,
        data: null,
      };
    }

    // Get base_currency from the workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("base_currency")
      .eq("id", wallet.workspace_id)
      .maybeSingle();

    if (workspaceError) {
      return {
        success: false,
        error: `Failed to fetch workspace: ${workspaceError.message}`,
        data: null,
      };
    }

    if (!workspace) {
      return {
        success: false,
        error: `Workspace not found`,
        data: null,
      };
    }

    // Type assertion needed because database types haven't been regenerated
    // The base_currency column exists in the database (see migration 20260128000005)
    const baseCurrency = (workspace as { base_currency?: string })
      .base_currency;

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

    const normalizedAmount = Math.round(Math.abs(amount) * 100);
    const signedAmount =
      type === "expense" ? -normalizedAmount : normalizedAmount;
    const baseAmount = Math.round(normalizedAmount * rate);
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
        conversion_rate_to_base: rate,
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
