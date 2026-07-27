"use server";

import {
  matchesTransactionRule,
  parseTransactionRuleRow,
  serializeTransactionRuleDefinition,
  transactionRuleDefinitionSchema,
  type TransactionRule,
  type TransactionRuleCandidate,
  type TransactionRuleDefinition,
} from "@/utils/transaction-rules";
import { createClient } from "@/utils/supabase/server";

const PAGE_SIZE = 500;

async function validateRuleTargets(
  workspaceId: string,
  definition: TransactionRuleDefinition,
) {
  const supabase = await createClient();
  const walletIds = definition.conditions
    .filter((condition) => condition.field === "wallet_id")
    .map((condition) => String(condition.value));
  const ontologyIds = definition.actions.ontologyAssociations.map(
    (association) => association.ontologyId,
  );

  const [categoryResult, labelResult, tagResult, walletResult, ontologyResult] =
    await Promise.all([
      definition.actions.categoryId
        ? supabase
            .from("categories")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("id", definition.actions.categoryId)
            .maybeSingle()
        : Promise.resolve({ data: { id: "" }, error: null }),
      definition.actions.labelId
        ? supabase
            .from("labels")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("id", definition.actions.labelId)
            .maybeSingle()
        : Promise.resolve({ data: { id: "" }, error: null }),
      definition.actions.tagIds.length > 0
        ? supabase
            .from("tags")
            .select("id")
            .eq("workspace_id", workspaceId)
            .in("id", definition.actions.tagIds)
        : Promise.resolve({ data: [], error: null }),
      walletIds.length > 0
        ? supabase
            .from("wallets")
            .select("id")
            .eq("workspace_id", workspaceId)
            .in("id", walletIds)
        : Promise.resolve({ data: [], error: null }),
      ontologyIds.length > 0
        ? supabase
            .from("ontology_entities")
            .select("id")
            .eq("workspace_id", workspaceId)
            .in("id", ontologyIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  const firstError =
    categoryResult.error ||
    labelResult.error ||
    tagResult.error ||
    walletResult.error ||
    ontologyResult.error;
  if (firstError) throw new Error(firstError.message);
  if (definition.actions.categoryId && !categoryResult.data) {
    throw new Error("Category does not belong to this workspace");
  }
  if (definition.actions.labelId && !labelResult.data) {
    throw new Error("Label does not belong to this workspace");
  }
  if (
    definition.actions.tagIds.length !==
    new Set(tagResult.data?.map((tag) => tag.id)).size
  ) {
    throw new Error("One or more tags do not belong to this workspace");
  }
  if (
    walletIds.length !==
    new Set(walletResult.data?.map((wallet) => wallet.id)).size
  ) {
    throw new Error("One or more wallets do not belong to this workspace");
  }
  if (
    ontologyIds.length !==
    new Set(ontologyResult.data?.map((entity) => entity.id)).size
  ) {
    throw new Error(
      "One or more canonical context entities do not belong to this workspace",
    );
  }
}

export async function listTransactionRules(
  workspaceId: string,
): Promise<TransactionRule[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("transaction_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("priority")
    .order("created_at");

  if (error) throw new Error(error.message);
  const rules = (rows ?? []).map(parseTransactionRuleRow);
  if (rules.length === 0) return [];

  const { data: applications, error: applicationsError } = await supabase
    .from("transaction_rule_applications")
    .select("rule_id, applied_at")
    .in(
      "rule_id",
      rules.map((rule) => rule.id),
    )
    .order("applied_at", { ascending: false });

  if (applicationsError) throw new Error(applicationsError.message);
  const stats = new Map<string, { count: number; last: string | null }>();
  for (const application of applications ?? []) {
    const current = stats.get(application.rule_id) ?? { count: 0, last: null };
    current.count += 1;
    current.last ||= application.applied_at;
    stats.set(application.rule_id, current);
  }

  return rules.map((rule) => ({
    ...rule,
    matchCount: stats.get(rule.id)?.count ?? 0,
    lastMatchedAt: stats.get(rule.id)?.last ?? null,
  }));
}

export async function createTransactionRule(input: {
  definition: TransactionRuleDefinition;
  workspaceId: string;
}) {
  const definition = transactionRuleDefinitionSchema.parse(input.definition);
  await validateRuleTargets(input.workspaceId, definition);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transaction_rules")
    .insert({
      ...serializeTransactionRuleDefinition(definition),
      workspace_id: input.workspaceId,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return parseTransactionRuleRow(data);
}

export async function updateTransactionRule(input: {
  definition: TransactionRuleDefinition;
  id: string;
  workspaceId: string;
}) {
  const definition = transactionRuleDefinitionSchema.parse(input.definition);
  await validateRuleTargets(input.workspaceId, definition);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transaction_rules")
    .update(serializeTransactionRuleDefinition(definition))
    .eq("id", input.id)
    .eq("workspace_id", input.workspaceId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return parseTransactionRuleRow(data);
}

export async function deleteTransactionRule(input: {
  id: string;
  workspaceId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transaction_rules")
    .delete()
    .eq("id", input.id)
    .eq("workspace_id", input.workspaceId);
  if (error) throw new Error(error.message);
}

export async function setTransactionRuleEnabled(input: {
  enabled: boolean;
  id: string;
  workspaceId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transaction_rules")
    .update({ enabled: input.enabled })
    .eq("id", input.id)
    .eq("workspace_id", input.workspaceId);
  if (error) throw new Error(error.message);
}

export async function reorderTransactionRules(input: {
  ids: string[];
  workspaceId: string;
}) {
  const supabase = await createClient();
  const results = await Promise.all(
    input.ids.map((id, priority) =>
      supabase
        .from("transaction_rules")
        .update({ priority })
        .eq("id", id)
        .eq("workspace_id", input.workspaceId),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}

function rowToCandidate(row: {
  amount_cents: number;
  currency: string;
  description: string | null;
  plaid_merchant_key: string | null;
  plaid_merchant_name: string | null;
  plaid_personal_finance_category_primary: string | null;
  type: "income" | "expense" | "transfer";
  wallet_id: string;
}): TransactionRuleCandidate {
  return {
    amountCents: row.amount_cents,
    currency: row.currency,
    description: row.description,
    merchantKey: row.plaid_merchant_key,
    merchantName: row.plaid_merchant_name,
    plaidCategory: row.plaid_personal_finance_category_primary,
    type: row.type,
    walletId: row.wallet_id,
  };
}

async function getRuleCategoryType(workspaceId: string, categoryId?: string) {
  if (!categoryId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("type")
    .eq("workspace_id", workspaceId)
    .eq("id", categoryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.type ?? null;
}

async function getMatchingTransactions(
  workspaceId: string,
  rule: TransactionRule,
) {
  const supabase = await createClient();
  const matches: Array<{
    amount_cents: number;
    category_id: string | null;
    currency: string;
    date: string;
    description: string | null;
    id: string;
    label_id: string | null;
    plaid_merchant_key: string | null;
    plaid_merchant_name: string | null;
    plaid_personal_finance_category_primary: string | null;
    type: "income" | "expense" | "transfer";
    wallet_id: string;
  }> = [];
  let page = 0;

  while (true) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, amount_cents, category_id, currency, date, description, label_id, plaid_merchant_key, plaid_merchant_name, plaid_personal_finance_category_primary, type, wallet_id, wallets!inner(workspace_id)",
      )
      .eq("wallets.workspace_id", workspaceId)
      .not("plaid_transaction_id", "is", null)
      .order("id")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const pageRows = data ?? [];
    for (const row of pageRows) {
      if (matchesTransactionRule(rule, rowToCandidate(row))) matches.push(row);
    }
    if (pageRows.length < PAGE_SIZE) break;
    page += 1;
  }

  return matches;
}

export async function previewTransactionRule(input: {
  definition: TransactionRuleDefinition;
  workspaceId: string;
}) {
  const definition = transactionRuleDefinitionSchema.parse(input.definition);
  const rule: TransactionRule = {
    ...definition,
    createdAt: "",
    id: "preview",
    updatedAt: "",
    workspaceId: input.workspaceId,
  };
  const [matches, categoryType] = await Promise.all([
    getMatchingTransactions(input.workspaceId, rule),
    getRuleCategoryType(input.workspaceId, definition.actions.categoryId),
  ]);

  return {
    count: matches.length,
    fillEmptyCount: matches.filter(
      (row) =>
        (definition.actions.categoryId &&
          categoryType === row.type &&
          !row.category_id) ||
        (definition.actions.labelId && !row.label_id) ||
        definition.actions.ontologyAssociations.length > 0 ||
        definition.actions.tagIds.length > 0,
    ).length,
    overwriteCount: matches.filter(
      (row) =>
        (definition.actions.categoryId &&
          categoryType === row.type &&
          row.category_id &&
          row.category_id !== definition.actions.categoryId) ||
        (definition.actions.labelId &&
          row.label_id &&
          row.label_id !== definition.actions.labelId),
    ).length,
    samples: matches.slice(0, 5).map((row) => ({
      amountCents: row.amount_cents,
      currency: row.currency,
      date: row.date,
      description: row.description,
      id: row.id,
    })),
  };
}

export async function applyTransactionRuleToHistory(input: {
  id: string;
  overwrite: boolean;
  workspaceId: string;
}) {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("transaction_rules")
    .select("*")
    .eq("id", input.id)
    .eq("workspace_id", input.workspaceId)
    .single();
  if (error) throw new Error(error.message);

  const rule = parseTransactionRuleRow(row);
  const [matches, categoryType] = await Promise.all([
    getMatchingTransactions(input.workspaceId, rule),
    getRuleCategoryType(input.workspaceId, rule.actions.categoryId),
  ]);
  let updatedCount = 0;

  for (const transaction of matches) {
    const update: { category_id?: string; label_id?: string } = {};
    if (
      rule.actions.categoryId &&
      categoryType === transaction.type &&
      (input.overwrite || !transaction.category_id)
    ) {
      update.category_id = rule.actions.categoryId;
    }
    if (rule.actions.labelId && (input.overwrite || !transaction.label_id)) {
      update.label_id = rule.actions.labelId;
    }

    if (Object.keys(update).length > 0) {
      const { error: updateError } = await supabase
        .from("transactions")
        .update(update)
        .eq("id", transaction.id);
      if (updateError) throw new Error(updateError.message);
    }

    if (rule.actions.tagIds.length > 0) {
      const { error: tagError } = await supabase
        .from("transaction_tags")
        .upsert(
          rule.actions.tagIds.map((tagId) => ({
            tag_id: tagId,
            transaction_id: transaction.id,
          })),
          { onConflict: "transaction_id,tag_id" },
        );
      if (tagError) throw new Error(tagError.message);
    }

    let appliedOntologyAssociations: typeof rule.actions.ontologyAssociations =
      [];
    if (rule.actions.ontologyAssociations.length > 0) {
      const { data: existingContext, error: contextError } = await supabase
        .from("transaction_ontology_associations")
        .select("transaction_id")
        .eq("transaction_id", transaction.id)
        .limit(1);
      if (contextError) throw new Error(contextError.message);

      if (!existingContext?.length) {
        const { error: ontologyError } = await supabase
          .from("transaction_ontology_associations")
          .insert(
            rule.actions.ontologyAssociations.map((association) => ({
              entity_type: association.type,
              ontology_entity_id: association.ontologyId,
              transaction_id: transaction.id,
            })),
          );
        if (ontologyError) throw new Error(ontologyError.message);
        appliedOntologyAssociations = rule.actions.ontologyAssociations;
      }
    }

    if (
      Object.keys(update).length > 0 ||
      rule.actions.tagIds.length > 0 ||
      appliedOntologyAssociations.length > 0
    ) {
      const { error: applicationError } = await supabase
        .from("transaction_rule_applications")
        .upsert(
          {
            applied_actions: {
              ...update,
              ontologyAssociations: appliedOntologyAssociations,
              tagIds: rule.actions.tagIds,
            },
            execution_mode: "backfill",
            rule_id: rule.id,
            transaction_id: transaction.id,
          },
          { onConflict: "rule_id,transaction_id,execution_mode" },
        );
      if (applicationError) throw new Error(applicationError.message);
      updatedCount += 1;
    }
  }

  return { updatedCount };
}
