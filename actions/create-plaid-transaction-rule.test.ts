import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPlaidTransactionRule } from "./create-plaid-transaction-rule";

import { createClient } from "@/utils/supabase/server";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockedCreateClient = vi.mocked(createClient);

function createSupabaseMock() {
  const ruleUpserts: Array<Record<string, unknown>> = [];
  const ruleAssociationInserts: Array<Record<string, unknown>> = [];
  const singleRows: Record<string, unknown> = {
    transactions: {
      id: "transaction-1",
      wallet_id: "wallet-1",
      category_id: "transaction-category",
      plaid_transaction_id: "plaid-1",
      plaid_merchant_key: "merchant",
      plaid_merchant_name: "Merchant",
      description: "Description",
    },
    wallets: { workspace_id: "workspace-1" },
    workspaces: {
      feature_flags: {
        bills_enabled: true,
        ontology_associations_enabled: true,
      },
    },
    plaid_transaction_rules: {
      id: "rule-1",
      category_id: "existing-category",
    },
  };
  const listRows: Record<string, unknown[]> = {
    transaction_ontology_associations: [
      {
        ontology_entity_id: "person-entity",
        entity_type: "person",
      },
      {
        ontology_entity_id: "place-entity",
        entity_type: "place",
      },
    ],
    plaid_transaction_rule_ontology_associations: [],
  };

  const client = {
    from: vi.fn((table: string) => {
      type QueryMock = {
        delete: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        insert: ReturnType<typeof vi.fn>;
        maybeSingle: ReturnType<typeof vi.fn>;
        select: ReturnType<typeof vi.fn>;
        single: ReturnType<typeof vi.fn>;
        then: (
          resolve: (value: { data: unknown[]; error: null }) => unknown,
        ) => Promise<unknown>;
        upsert: ReturnType<typeof vi.fn>;
      };
      const query = {} as QueryMock;
      query.delete = vi.fn(() => query);
      query.eq = vi.fn(() => query);
      query.insert = vi.fn((rows: Array<Record<string, unknown>>) => {
        if (table === "plaid_transaction_rule_ontology_associations") {
          ruleAssociationInserts.push(...rows);
        }
        return Promise.resolve({ error: null });
      });
      query.maybeSingle = vi.fn(async () => ({
        data: singleRows[table] ?? null,
        error: null,
      }));
      query.select = vi.fn(() => query);
      query.single = vi.fn(async () => ({
        data:
          table === "plaid_transaction_rules"
            ? { id: "rule-1" }
            : singleRows[table],
        error: null,
      }));
      query.then = (
        resolve: (value: { data: unknown[]; error: null }) => unknown,
      ) =>
        Promise.resolve({
          data: listRows[table] ?? [],
          error: null,
        }).then(resolve);
      query.upsert = vi.fn((row: Record<string, unknown>) => {
        ruleUpserts.push(row);
        return query;
      });
      return query;
    }),
  };

  return { client, ruleAssociationInserts, ruleUpserts };
}

describe("createPlaidTransactionRule", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a context rule without overwriting an existing category rule", async () => {
    const supabase = createSupabaseMock();
    mockedCreateClient.mockResolvedValue(supabase.client as never);

    const result = await createPlaidTransactionRule({
      transactionId: "transaction-1",
      includeCategory: false,
      includeOntologyAssociations: true,
    });

    expect(result).toMatchObject({
      error: null,
      learnedCategory: false,
      learnedOntologyAssociations: true,
      merchantName: "Merchant",
    });
    expect(supabase.ruleUpserts).toEqual([
      {
        wallet_id: "wallet-1",
        merchant_key: "merchant",
        category_id: "existing-category",
      },
    ]);
    expect(supabase.ruleAssociationInserts).toEqual([
      {
        rule_id: "rule-1",
        ontology_entity_id: "person-entity",
        entity_type: "person",
      },
      {
        rule_id: "rule-1",
        ontology_entity_id: "place-entity",
        entity_type: "place",
      },
    ]);
  });
});
