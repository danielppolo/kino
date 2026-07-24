import { describe, expect, it } from "vitest";

import {
  matchesTransactionRuleCondition,
  resolveTransactionRules,
  type TransactionRule,
  type TransactionRuleCandidate,
} from "./transaction-rules";

const candidate: TransactionRuleCandidate = {
  amountCents: -1299,
  currency: "USD",
  description: "Coffee at Acme Roasters",
  merchantKey: "acme roasters",
  merchantName: "Acme Roasters",
  plaidCategory: "FOOD_AND_DRINK",
  type: "expense",
  walletId: "wallet-id",
};

function rule(
  overrides: Partial<TransactionRule> &
    Pick<TransactionRule, "id" | "priority">,
): TransactionRule {
  return {
    actions: { tagIds: [] },
    conditions: [{ field: "merchant", operator: "is", value: "acme roasters" }],
    createdAt: `2026-01-0${overrides.priority + 1}`,
    enabled: true,
    matchMode: "all",
    name: overrides.id,
    stopProcessing: false,
    triggerSource: "plaid",
    updatedAt: "2026-01-01",
    workspaceId: "workspace-id",
    ...overrides,
  };
}

describe("transaction rule conditions", () => {
  it("matches normalized text and absolute cents", () => {
    expect(
      matchesTransactionRuleCondition(
        { field: "description", operator: "contains", value: "ACME" },
        candidate,
      ),
    ).toBe(true);
    expect(
      matchesTransactionRuleCondition(
        { field: "amount", operator: "is", value: 1299 },
        candidate,
      ),
    ).toBe(true);
  });

  it("supports inclusive amount ranges", () => {
    expect(
      matchesTransactionRuleCondition(
        {
          field: "amount",
          operator: "between",
          value: 1200,
          valueTo: 1300,
        },
        candidate,
      ),
    ).toBe(true);
  });
});

describe("resolveTransactionRules", () => {
  it("lets higher priority rules win per field while accumulating tags", () => {
    const result = resolveTransactionRules({
      candidate,
      rules: [
        rule({
          actions: {
            categoryId: "00000000-0000-4000-8000-000000000001",
            tagIds: ["00000000-0000-4000-8000-000000000011"],
          },
          id: "category-rule",
          priority: 0,
        }),
        rule({
          actions: {
            categoryId: "00000000-0000-4000-8000-000000000002",
            labelId: "00000000-0000-4000-8000-000000000003",
            tagIds: ["00000000-0000-4000-8000-000000000012"],
          },
          id: "label-rule",
          priority: 1,
        }),
      ],
    });

    expect(result.categoryId).toBe("00000000-0000-4000-8000-000000000001");
    expect(result.labelId).toBe("00000000-0000-4000-8000-000000000003");
    expect(result.tagIds).toEqual([
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000012",
    ]);
  });

  it("stops after a matching stop-processing rule", () => {
    const result = resolveTransactionRules({
      candidate,
      rules: [
        rule({
          actions: {
            categoryId: "00000000-0000-4000-8000-000000000001",
            tagIds: [],
          },
          id: "stop",
          priority: 0,
          stopProcessing: true,
        }),
        rule({
          actions: {
            labelId: "00000000-0000-4000-8000-000000000003",
            tagIds: [],
          },
          id: "never",
          priority: 1,
        }),
      ],
    });

    expect(result.categoryId).toBeTruthy();
    expect(result.labelId).toBeUndefined();
  });
});
