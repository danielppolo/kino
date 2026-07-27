import { beforeEach, describe, expect, it, vi } from "vitest";

import { syncWalletPlaidTransactions } from "./sync";
import type { PlaidFetchedTransaction } from "./types";

const { fetchPlaidTransactions } = vi.hoisted(() => ({
  fetchPlaidTransactions: vi.fn(),
}));

vi.mock("./server", async () => {
  return {
    decryptWalletAccessToken: vi.fn((token: string) => token),
    fetchPlaidTransactions,
    getPlaidPreviewTransactions: vi.fn((transactions) => transactions),
    serializeWalletPlaidConnection: vi.fn((connection) => connection),
    transactionMatchesImportStart: vi.fn(() => true),
  };
});

function createQueryResult<T>(result: T) {
  type Query = {
    eq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    then: (
      resolve: (value: T) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
  };

  const query = {} as Query;
  query.eq = vi.fn(() => query);
  query.in = vi.fn(async () => result);
  query.order = vi.fn(() => query);
  query.single = vi.fn(async () => result);
  query.select = vi.fn(() => query);
  query.then = (resolve, reject) =>
    Promise.resolve(result).then(resolve, reject);

  return query;
}

function createSupabaseMock({
  existingOntologyAssociations = [],
  existingTransactions,
  rules = [],
  ontologyEnabled = false,
}: {
  existingOntologyAssociations?: Array<Record<string, unknown>>;
  existingTransactions: Array<Record<string, unknown>>;
  rules?: Array<Record<string, unknown>>;
  ontologyEnabled?: boolean;
}) {
  const upserts: Array<Record<string, unknown>> = [];
  const ontologyAssociationInserts: Array<Record<string, unknown>> = [];
  const ruleApplicationUpserts: Array<Record<string, unknown>> = [];
  const ruleTagUpserts: Array<Record<string, unknown>> = [];

  const client = {
    from: vi.fn((table: string) => {
      if (table === "plaid_ignored_transaction_ids") {
        return createQueryResult({ data: [], error: null });
      }

      if (table === "transaction_rules") {
        return createQueryResult({ data: rules, error: null });
      }

      if (table === "categories") {
        return createQueryResult({
          data: [
            {
              id: "00000000-0000-4000-8000-000000000010",
              type: "expense",
            },
          ],
          error: null,
        });
      }

      if (table === "workspaces") {
        return createQueryResult({
          data: {
            base_currency: "USD",
            feature_flags: {
              bills_enabled: true,
              ontology_associations_enabled: ontologyEnabled,
            },
          },
          error: null,
        });
      }

      if (table === "transaction_ontology_associations") {
        return {
          select: vi.fn(() =>
            createQueryResult({
              data: existingOntologyAssociations,
              error: null,
            }),
          ),
          insert: vi.fn(async (rows: Array<Record<string, unknown>>) => {
            ontologyAssociationInserts.push(...rows);
            return { error: null };
          }),
        };
      }

      if (table === "transaction_tags") {
        return {
          upsert: vi.fn(async (rows: Array<Record<string, unknown>>) => {
            ruleTagUpserts.push(...rows);
            return { error: null };
          }),
        };
      }

      if (table === "transaction_rule_applications") {
        return {
          upsert: vi.fn(async (rows: Array<Record<string, unknown>>) => {
            ruleApplicationUpserts.push(...rows);
            return { error: null };
          }),
        };
      }

      if (table === "transactions") {
        return {
          select: vi.fn(() =>
            createQueryResult({ data: existingTransactions, error: null }),
          ),
          upsert: vi.fn((rows: Array<Record<string, unknown>>) => {
            upserts.push(...rows);

            return {
              select: vi.fn(async () => ({
                data: rows.map((row) => ({
                  id: row.id,
                  plaid_transaction_id: row.plaid_transaction_id,
                })),
                error: null,
              })),
            };
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    client,
    ontologyAssociationInserts,
    ruleApplicationUpserts,
    ruleTagUpserts,
    upserts,
  };
}

const wallet = {
  balance_cents: null,
  color: null,
  currency: "USD",
  id: "wallet-id",
  name: "Checking",
  notes: null,
  plaid_access_token_encrypted: "encrypted-token",
  plaid_account_id: "plaid-account-id",
  plaid_account_mask: null,
  plaid_account_name: "Plaid Checking",
  plaid_institution_name: "Plaid Bank",
  plaid_item_id: "plaid-item-id",
  plaid_last_refreshed_at: "2026-05-17T12:00:00.000Z",
  plaid_sync_enabled: true,
  plaid_sync_start_at: "2026-01-01T00:00:00.000Z",
  position: null,
  visible: true,
  wallet_type: "bank_account",
  workspace_id: "workspace-id",
} as const;

const plaidTransaction: PlaidFetchedTransaction = {
  amount: 12.34,
  category: "Food and Drink",
  currency: "USD",
  date: "2026-05-16",
  datetime: "2026-05-16T12:00:00.000Z",
  merchant_name: "Plaid Merchant",
  name: "PLAID RAW DESCRIPTION",
  pending: false,
  pending_transaction_id: null,
  plaid_merchant_key: "plaid merchant",
  plaid_merchant_name: "Plaid Merchant",
  plaid_personal_finance_category_primary: "FOOD_AND_DRINK",
  plaid_transaction_id: "plaid-transaction-id",
};

function createRule(actions: Record<string, unknown>) {
  return {
    actions: {
      ontologyAssociations: [],
      tagIds: [],
      ...actions,
    },
    conditions: [
      { field: "merchant", operator: "is", value: "plaid merchant" },
    ],
    created_at: "2026-01-01T00:00:00.000Z",
    enabled: true,
    id: "rule-id",
    match_mode: "all",
    name: "Plaid merchant",
    priority: 0,
    stop_processing: false,
    trigger_source: "plaid",
    updated_at: "2026-01-01T00:00:00.000Z",
    workspace_id: "workspace-id",
  };
}

describe("syncWalletPlaidTransactions", () => {
  beforeEach(() => {
    fetchPlaidTransactions.mockReset();
  });

  it("does not overwrite the description for an existing Plaid transaction", async () => {
    fetchPlaidTransactions.mockResolvedValue([plaidTransaction]);
    const supabase = createSupabaseMock({
      existingTransactions: [
        {
          id: "existing-transaction-id",
          category_id: "existing-category-id",
          description: "Custom coffee run",
          label_id: null,
          note: null,
          plaid_pending_transaction_id: null,
          plaid_transaction_id: "plaid-transaction-id",
        },
      ],
    });

    await syncWalletPlaidTransactions({
      accessToken: "access-token",
      supabase: supabase.client as never,
      wallet: wallet as never,
    });

    expect(supabase.upserts).toHaveLength(1);
    expect(supabase.upserts[0]).toMatchObject({
      id: "existing-transaction-id",
      description: "Custom coffee run",
      plaid_transaction_id: "plaid-transaction-id",
    });
  });

  it("applies learned canonical associations to imported transactions", async () => {
    fetchPlaidTransactions.mockResolvedValue([plaidTransaction]);
    const supabase = createSupabaseMock({
      existingTransactions: [],
      ontologyEnabled: true,
      rules: [
        createRule({
          categoryId: "00000000-0000-4000-8000-000000000010",
          ontologyAssociations: [
            {
              name: "Person",
              ontologyId: "00000000-0000-4000-8000-000000000001",
              sourceObjectId: "person-source-id",
              type: "person",
            },
            {
              name: "Trip",
              ontologyId: "00000000-0000-4000-8000-000000000002",
              sourceObjectId: "trip-source-id",
              type: "trip",
            },
          ],
        }),
      ],
    });

    await syncWalletPlaidTransactions({
      accessToken: "access-token",
      supabase: supabase.client as never,
      wallet: wallet as never,
    });

    expect(supabase.upserts).toHaveLength(1);
    expect(supabase.upserts[0]).toMatchObject({
      category_id: "00000000-0000-4000-8000-000000000010",
    });
    expect(supabase.ontologyAssociationInserts).toEqual([
      {
        transaction_id: supabase.upserts[0].id,
        ontology_entity_id: "00000000-0000-4000-8000-000000000001",
        entity_type: "person",
      },
      {
        transaction_id: supabase.upserts[0].id,
        ontology_entity_id: "00000000-0000-4000-8000-000000000002",
        entity_type: "trip",
      },
    ]);
  });

  it("does not overwrite existing canonical context with a learned rule", async () => {
    fetchPlaidTransactions.mockResolvedValue([plaidTransaction]);
    const supabase = createSupabaseMock({
      existingOntologyAssociations: [
        { transaction_id: "existing-transaction-id" },
      ],
      existingTransactions: [
        {
          id: "existing-transaction-id",
          category_id: null,
          description: "Existing transaction",
          label_id: null,
          note: null,
          plaid_pending_transaction_id: null,
          plaid_transaction_id: "plaid-transaction-id",
        },
      ],
      ontologyEnabled: true,
      rules: [
        createRule({
          ontologyAssociations: [
            {
              name: "Place",
              ontologyId: "00000000-0000-4000-8000-000000000003",
              sourceObjectId: "place-source-id",
              type: "place",
            },
          ],
        }),
      ],
    });

    await syncWalletPlaidTransactions({
      accessToken: "access-token",
      supabase: supabase.client as never,
      wallet: wallet as never,
    });

    expect(supabase.ontologyAssociationInserts).toEqual([]);
  });
});
