import type { TransactionList } from "@/utils/supabase/types";
import type {
  TransactionRule,
  TransactionRuleCandidate,
  TransactionRuleCondition,
  TransactionRuleDefinition,
} from "@/utils/transaction-rules";
import { matchesTransactionRule } from "@/utils/transaction-rules";

type ImprovementField = Extract<
  TransactionRuleCondition["field"],
  "description" | "merchant" | "plaid_category"
>;

const improvementFields = new Set<ImprovementField>([
  "description",
  "merchant",
  "plaid_category",
]);

export function transactionToRuleCandidate(
  transaction: TransactionList,
): TransactionRuleCandidate {
  return {
    amountCents: transaction.amount_cents ?? 0,
    currency: transaction.currency ?? "USD",
    description: transaction.description,
    merchantKey: transaction.plaid_merchant_key,
    merchantName: transaction.plaid_merchant_name,
    plaidCategory: transaction.plaid_personal_finance_category_primary,
    type: transaction.type ?? "expense",
    walletId: transaction.wallet_id ?? "",
  };
}

export function transactionMatchesRule(
  rule: TransactionRule,
  transaction: TransactionList,
) {
  return matchesTransactionRule(rule, transactionToRuleCandidate(transaction));
}

function getSuggestedValue(
  field: ImprovementField,
  transaction: TransactionList,
) {
  if (field === "merchant") {
    return transaction.plaid_merchant_name ?? transaction.plaid_merchant_key;
  }
  if (field === "plaid_category") {
    return transaction.plaid_personal_finance_category_primary;
  }

  const description = transaction.description;
  const merchant = transaction.plaid_merchant_name?.trim();
  if (
    description &&
    merchant &&
    description.toLocaleLowerCase().includes(merchant.toLocaleLowerCase())
  ) {
    return merchant;
  }
  return description;
}

export function getRuleImprovementSuggestion(
  rule: TransactionRule,
  transaction: TransactionList,
): TransactionRuleCondition | null {
  const firstField = rule.conditions[0]?.field;
  if (
    !firstField ||
    !improvementFields.has(firstField as ImprovementField) ||
    !rule.conditions.every((condition) => condition.field === firstField) ||
    !rule.conditions.every((condition) => condition.operator !== "is_not") ||
    (rule.matchMode !== "any" && rule.conditions.length !== 1)
  ) {
    return null;
  }

  const field = firstField as ImprovementField;
  const value = getSuggestedValue(field, transaction)?.trim();
  if (!value) return null;

  const normalizedValue = value.toLocaleLowerCase();
  const duplicate = rule.conditions.some(
    (condition) =>
      condition.operator === "contains" &&
      String(condition.value).trim().toLocaleLowerCase() === normalizedValue,
  );
  if (duplicate) return null;

  return { field, operator: "contains", value };
}

export function addImprovementCondition(
  definition: TransactionRuleDefinition,
  condition: TransactionRuleCondition,
): TransactionRuleDefinition {
  return {
    ...definition,
    conditions: [...definition.conditions, condition],
    matchMode: "any",
  };
}

export function rankRulesForTransaction(
  rules: TransactionRule[],
  transaction: TransactionList,
) {
  return rules
    .map((rule, index) => {
      const suggestion = getRuleImprovementSuggestion(rule, transaction);
      const alreadyMatches = transactionMatchesRule(rule, transaction);
      let score = suggestion ? 20 : 0;

      if (
        transaction.category_id &&
        transaction.category_id === rule.actions.categoryId
      ) {
        score += 12;
      }
      if (
        transaction.label_id &&
        transaction.label_id === rule.actions.labelId
      ) {
        score += 8;
      }
      const transactionTags = new Set(transaction.tag_ids ?? []);
      score += rule.actions.tagIds.filter((tagId) =>
        transactionTags.has(tagId),
      ).length;
      if (alreadyMatches) score -= 30;

      return { alreadyMatches, index, rule, score, suggestion };
    })
    .sort(
      (left, right) => right.score - left.score || left.index - right.index,
    );
}
