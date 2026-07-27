import { z } from "zod";

import type { Json } from "@/utils/supabase/database.types";

export const transactionRuleFieldSchema = z.enum([
  "wallet_id",
  "type",
  "merchant",
  "description",
  "amount",
  "currency",
  "plaid_category",
]);

export const transactionRuleOperatorSchema = z.enum([
  "is",
  "is_not",
  "contains",
  "starts_with",
  "greater_than",
  "less_than",
  "between",
]);

export const transactionRuleConditionSchema = z
  .object({
    field: transactionRuleFieldSchema,
    operator: transactionRuleOperatorSchema,
    value: z.union([z.string(), z.number()]),
    valueTo: z.number().optional(),
  })
  .superRefine((condition, context) => {
    const numericOperators = new Set([
      "is",
      "is_not",
      "greater_than",
      "less_than",
      "between",
    ]);
    const textOperators = new Set(["is", "is_not", "contains", "starts_with"]);
    const enumOperators = new Set(["is", "is_not"]);

    if (
      typeof condition.value === "string" &&
      condition.value.trim().length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Condition values cannot be empty",
        path: ["value"],
      });
    }
    if (
      condition.field === "amount" &&
      (typeof condition.value !== "number" ||
        !numericOperators.has(condition.operator))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a valid amount operator and value",
        path: ["operator"],
      });
    }
    if (
      condition.field === "amount" &&
      condition.operator === "between" &&
      condition.valueTo === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount ranges require an upper value",
        path: ["valueTo"],
      });
    }
    if (
      ["wallet_id", "type", "currency"].includes(condition.field) &&
      !enumOperators.has(condition.operator)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a valid comparison operator",
        path: ["operator"],
      });
    }
    if (
      ["merchant", "description", "plaid_category"].includes(condition.field) &&
      !textOperators.has(condition.operator)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a valid text operator",
        path: ["operator"],
      });
    }
  });

export const transactionRuleActionsSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    labelId: z.string().uuid().optional(),
    ontologyAssociations: z
      .array(
        z.object({
          entityId: z.string().optional(),
          name: z.string().min(1),
          ontologyId: z.string().uuid(),
          sourceObjectId: z.string().min(1),
          subtitle: z.string().optional(),
          type: z.enum(["person", "place", "organization", "trip"]),
        }),
      )
      .default([]),
    tagIds: z.array(z.string().uuid()).default([]),
  })
  .refine(
    (actions) =>
      Boolean(
        actions.categoryId ||
          actions.labelId ||
          actions.ontologyAssociations.length > 0 ||
          (actions.tagIds && actions.tagIds.length > 0),
      ),
    "Choose at least one action",
  );

export const transactionRuleDefinitionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0),
  triggerSource: z.literal("plaid"),
  matchMode: z.enum(["all", "any"]),
  conditions: z
    .array(transactionRuleConditionSchema)
    .min(1, "Add at least one condition"),
  actions: transactionRuleActionsSchema,
  stopProcessing: z.boolean().default(false),
});

export type TransactionRuleCondition = z.infer<
  typeof transactionRuleConditionSchema
>;
export type TransactionRuleActions = z.infer<
  typeof transactionRuleActionsSchema
>;
export type TransactionRuleDefinition = z.infer<
  typeof transactionRuleDefinitionSchema
>;

export interface TransactionRule extends TransactionRuleDefinition {
  id: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  matchCount?: number;
  lastMatchedAt?: string | null;
}

export interface TransactionRuleCandidate {
  amountCents: number;
  currency: string;
  description: string | null;
  merchantKey: string | null;
  merchantName: string | null;
  plaidCategory: string | null;
  type: "income" | "expense" | "transfer";
  walletId: string;
}

export interface TransactionRuleResolution {
  categoryId?: string;
  labelId?: string;
  ontologyAssociations: TransactionRuleActions["ontologyAssociations"];
  tagIds: string[];
  applications: Array<{
    appliedActions: TransactionRuleActions;
    ruleId: string;
  }>;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase();
}

function getConditionValue(
  condition: TransactionRuleCondition,
  candidate: TransactionRuleCandidate,
): string | number {
  switch (condition.field) {
    case "wallet_id":
      return candidate.walletId;
    case "type":
      return candidate.type;
    case "merchant":
      return candidate.merchantKey || candidate.merchantName || "";
    case "description":
      return candidate.description ?? "";
    case "amount":
      return Math.abs(candidate.amountCents);
    case "currency":
      return candidate.currency;
    case "plaid_category":
      return candidate.plaidCategory ?? "";
  }
}

export function matchesTransactionRuleCondition(
  condition: TransactionRuleCondition,
  candidate: TransactionRuleCandidate,
) {
  const actual = getConditionValue(condition, candidate);

  if (condition.field === "amount") {
    const expected = Number(condition.value);
    const numericActual = Number(actual);
    switch (condition.operator) {
      case "is":
        return numericActual === expected;
      case "is_not":
        return numericActual !== expected;
      case "greater_than":
        return numericActual > expected;
      case "less_than":
        return numericActual < expected;
      case "between":
        return (
          numericActual >= Math.min(expected, condition.valueTo ?? expected) &&
          numericActual <= Math.max(expected, condition.valueTo ?? expected)
        );
      default:
        return false;
    }
  }

  const normalizedActual = normalizeText(String(actual));
  const normalizedExpected = normalizeText(String(condition.value));

  switch (condition.operator) {
    case "is":
      return normalizedActual === normalizedExpected;
    case "is_not":
      return normalizedActual !== normalizedExpected;
    case "contains":
      return normalizedActual.includes(normalizedExpected);
    case "starts_with":
      return normalizedActual.startsWith(normalizedExpected);
    default:
      return false;
  }
}

export function matchesTransactionRule(
  rule: TransactionRule,
  candidate: TransactionRuleCandidate,
) {
  const matches = rule.conditions.map((condition) =>
    matchesTransactionRuleCondition(condition, candidate),
  );
  return rule.matchMode === "all"
    ? matches.every(Boolean)
    : matches.some(Boolean);
}

export function resolveTransactionRules({
  candidate,
  rules,
}: {
  candidate: TransactionRuleCandidate;
  rules: TransactionRule[];
}): TransactionRuleResolution {
  const resolution: TransactionRuleResolution = {
    applications: [],
    ontologyAssociations: [],
    tagIds: [],
  };
  const ontologyKeys = new Set<string>();
  const singletonOntologyTypes = new Set(["place", "organization", "trip"]);
  const tagIds = new Set<string>();

  for (const rule of [...rules].sort(
    (a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt),
  )) {
    if (
      !rule.enabled ||
      rule.triggerSource !== "plaid" ||
      !matchesTransactionRule(rule, candidate)
    ) {
      continue;
    }

    const appliedActions: TransactionRuleActions = {
      ontologyAssociations: [],
      tagIds: [],
    };
    if (!resolution.categoryId && rule.actions.categoryId) {
      resolution.categoryId = rule.actions.categoryId;
      appliedActions.categoryId = rule.actions.categoryId;
    }
    if (!resolution.labelId && rule.actions.labelId) {
      resolution.labelId = rule.actions.labelId;
      appliedActions.labelId = rule.actions.labelId;
    }
    for (const tagId of rule.actions.tagIds ?? []) {
      if (!tagIds.has(tagId)) {
        tagIds.add(tagId);
        appliedActions.tagIds.push(tagId);
      }
    }
    for (const association of rule.actions.ontologyAssociations ?? []) {
      const key = `${association.type}:${association.ontologyId}`;
      const singletonAlreadySet =
        singletonOntologyTypes.has(association.type) &&
        resolution.ontologyAssociations.some(
          (existing) => existing.type === association.type,
        );
      if (!ontologyKeys.has(key) && !singletonAlreadySet) {
        ontologyKeys.add(key);
        resolution.ontologyAssociations.push(association);
        appliedActions.ontologyAssociations.push(association);
      }
    }

    if (
      appliedActions.categoryId ||
      appliedActions.labelId ||
      appliedActions.ontologyAssociations.length > 0 ||
      appliedActions.tagIds.length > 0
    ) {
      resolution.applications.push({
        ruleId: rule.id,
        appliedActions,
      });
    }

    if (rule.stopProcessing) break;
  }

  resolution.tagIds = Array.from(tagIds);
  return resolution;
}

export function parseTransactionRuleRow(row: {
  actions: Json;
  conditions: Json;
  created_at: string;
  enabled: boolean;
  id: string;
  match_mode: string;
  name: string;
  priority: number;
  stop_processing: boolean;
  trigger_source: string;
  updated_at: string;
  workspace_id: string;
}): TransactionRule {
  const parsed = transactionRuleDefinitionSchema.parse({
    actions: row.actions,
    conditions: row.conditions,
    enabled: row.enabled,
    matchMode: row.match_mode,
    name: row.name,
    priority: row.priority,
    stopProcessing: row.stop_processing,
    triggerSource: row.trigger_source,
  });

  return {
    ...parsed,
    id: row.id,
    workspaceId: row.workspace_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeTransactionRuleDefinition(
  definition: TransactionRuleDefinition,
) {
  const parsed = transactionRuleDefinitionSchema.parse(definition);
  return {
    actions: parsed.actions as Json,
    conditions: parsed.conditions as Json,
    enabled: parsed.enabled,
    match_mode: parsed.matchMode,
    name: parsed.name,
    priority: parsed.priority,
    stop_processing: parsed.stopProcessing,
    trigger_source: parsed.triggerSource,
  };
}
