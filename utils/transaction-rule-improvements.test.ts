import { describe, expect, it } from "vitest";

import type { TransactionList } from "./supabase/types";
import {
  addImprovementCondition,
  getRuleImprovementSuggestion,
  rankRulesForTransaction,
} from "./transaction-rule-improvements";
import type { TransactionRule } from "./transaction-rules";

const transaction = {
  amount_cents: -645,
  category_id: "category-coffee",
  currency: "USD",
  date: "2026-08-14",
  description: "STARBUCKS STORE 10482 SEATTLE WA",
  id: "transaction-id",
  label_id: null,
  plaid_merchant_key: "starbucks",
  plaid_merchant_name: "Starbucks",
  plaid_personal_finance_category_primary: "FOOD_AND_DRINK",
  tag_ids: [],
  type: "expense",
  wallet_id: "wallet-id",
} as unknown as TransactionList;

function rule(overrides: Partial<TransactionRule> = {}): TransactionRule {
  return {
    actions: {
      categoryId: "category-coffee",
      ontologyAssociations: [],
      tagIds: [],
    },
    conditions: [
      { field: "description", operator: "contains", value: "Blue Bottle" },
    ],
    createdAt: "2026-01-01",
    enabled: true,
    id: "rule-id",
    matchMode: "any",
    name: "Coffee",
    priority: 0,
    stopProcessing: false,
    triggerSource: "plaid",
    updatedAt: "2026-01-01",
    workspaceId: "workspace-id",
    ...overrides,
  };
}

describe("transaction rule improvements", () => {
  it("uses the merchant name as a concise description pattern", () => {
    expect(getRuleImprovementSuggestion(rule(), transaction)).toEqual({
      field: "description",
      operator: "contains",
      value: "Starbucks",
    });
  });

  it("does not flatten a mixed or multi-condition all rule", () => {
    expect(
      getRuleImprovementSuggestion(
        rule({
          conditions: [
            { field: "type", operator: "is", value: "expense" },
            {
              field: "description",
              operator: "contains",
              value: "Blue Bottle",
            },
          ],
          matchMode: "all",
        }),
        transaction,
      ),
    ).toBeNull();
  });

  it("does not add a positive OR pattern to a negative rule", () => {
    expect(
      getRuleImprovementSuggestion(
        rule({
          conditions: [
            { field: "description", operator: "is_not", value: "Tea" },
          ],
        }),
        transaction,
      ),
    ).toBeNull();
  });

  it("converts a single-condition rule to any when adding a pattern", () => {
    const definition = rule({ matchMode: "all" });
    const suggestion = getRuleImprovementSuggestion(definition, transaction)!;
    const updated = addImprovementCondition(definition, suggestion);

    expect(updated.matchMode).toBe("any");
    expect(updated.conditions).toHaveLength(2);
  });

  it("ranks a compatible rule with matching actions first", () => {
    const mixedRule = rule({
      actions: { ontologyAssociations: [], tagIds: [] },
      conditions: [
        { field: "type", operator: "is", value: "expense" },
        { field: "description", operator: "contains", value: "Cafe" },
      ],
      id: "mixed",
      matchMode: "all",
    });

    expect(
      rankRulesForTransaction([mixedRule, rule()], transaction)[0].rule.id,
    ).toBe("rule-id");
  });
});
