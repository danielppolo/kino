"use server";

import { createClient } from "@/utils/supabase/server";
import {
  DEFAULT_FEATURE_FLAGS,
  parseFeatureFlags,
} from "@/utils/types/feature-flags";

interface CreatePlaidTransactionRuleInput {
  transactionId: string;
  includeCategory: boolean;
  includeOntologyAssociations: boolean;
}

export async function createPlaidTransactionRule({
  transactionId,
  includeCategory,
  includeOntologyAssociations,
}: CreatePlaidTransactionRuleInput) {
  if (!includeCategory && !includeOntologyAssociations) {
    return { error: "Choose at least one rule action" };
  }

  const supabase = await createClient();

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select(
      "id, wallet_id, category_id, plaid_transaction_id, plaid_merchant_key, plaid_merchant_name, description",
    )
    .eq("id", transactionId)
    .maybeSingle();

  if (transactionError) {
    return { error: transactionError.message };
  }

  if (!transaction?.plaid_transaction_id) {
    return {
      error: "Only Plaid-imported transactions can create learned rules",
    };
  }

  if (!transaction.wallet_id) {
    return { error: "Transaction wallet not found" };
  }

  if (!transaction.plaid_merchant_key) {
    return { error: "This transaction is missing a merchant key for learning" };
  }

  if (includeCategory && !transaction.category_id) {
    return { error: "This transaction has no category to learn" };
  }

  const { data: existingRule, error: existingRuleError } = await supabase
    .from("plaid_transaction_rules")
    .select("id, category_id")
    .eq("wallet_id", transaction.wallet_id)
    .eq("merchant_key", transaction.plaid_merchant_key)
    .maybeSingle();

  if (existingRuleError) {
    return { error: existingRuleError.message };
  }

  if (includeOntologyAssociations) {
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("workspace_id")
      .eq("id", transaction.wallet_id)
      .maybeSingle();
    if (walletError || !wallet) {
      return { error: walletError?.message ?? "Transaction wallet not found" };
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("feature_flags")
      .eq("id", wallet.workspace_id)
      .maybeSingle();
    if (workspaceError || !workspace) {
      return { error: workspaceError?.message ?? "Workspace not found" };
    }

    const flags = workspace.feature_flags
      ? parseFeatureFlags(workspace.feature_flags)
      : DEFAULT_FEATURE_FLAGS;
    if (!flags.ontology_associations_enabled) {
      return {
        error: "Canonical transaction context is disabled for this workspace",
      };
    }
  }

  const { data: savedRule, error: upsertError } = await supabase
    .from("plaid_transaction_rules")
    .upsert(
      {
        wallet_id: transaction.wallet_id,
        merchant_key: transaction.plaid_merchant_key,
        category_id: includeCategory
          ? transaction.category_id
          : (existingRule?.category_id ?? null),
      },
      {
        onConflict: "wallet_id,merchant_key",
      },
    )
    .select("id")
    .single();

  if (upsertError || !savedRule) {
    return { error: upsertError?.message ?? "Failed to save learned rule" };
  }

  if (includeOntologyAssociations) {
    const [
      { data: associations, error: associationsError },
      { data: previous },
    ] = await Promise.all([
      supabase
        .from("transaction_ontology_associations")
        .select("ontology_entity_id, entity_type")
        .eq("transaction_id", transaction.id),
      supabase
        .from("plaid_transaction_rule_ontology_associations")
        .select("rule_id, ontology_entity_id, entity_type")
        .eq("rule_id", savedRule.id),
    ]);

    if (associationsError) {
      return { error: associationsError.message };
    }

    const { error: deleteError } = await supabase
      .from("plaid_transaction_rule_ontology_associations")
      .delete()
      .eq("rule_id", savedRule.id);
    if (deleteError) {
      return { error: deleteError.message };
    }

    if (associations?.length) {
      const { error: insertError } = await supabase
        .from("plaid_transaction_rule_ontology_associations")
        .insert(
          associations.map((association) => ({
            rule_id: savedRule.id,
            ontology_entity_id: association.ontology_entity_id,
            entity_type: association.entity_type,
          })),
        );

      if (insertError) {
        if (previous?.length) {
          await supabase
            .from("plaid_transaction_rule_ontology_associations")
            .insert(previous);
        }
        return { error: insertError.message };
      }
    }
  }

  return {
    error: null,
    learnedCategory: includeCategory,
    learnedOntologyAssociations: includeOntologyAssociations,
    merchantName:
      transaction.plaid_merchant_name ??
      transaction.description ??
      "this merchant",
  };
}
