import { beforeEach, describe, expect, it, vi } from "vitest";

import { syncWalletPlaidTransactions } from "./sync";
import type { PlaidFetchedTransaction } from "./types";

const { fetchPlaidTransactions } = vi.hoisted(() => ({
  fetchPlaidTransactions: vi.fn(),
}));

vi.mock("./server", async () => {
  const actual = await vi.importActual<typeof import("./server")>("./server");

  return {
    ...actual,
    fetchPlaidTransactions,
  };
});

function createQueryResult<T>(result: T) {
  type Query = {
    eq: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
  };

  const query = {} as Query;
  query.eq = vi.fn(() => query);
  query.in = vi.fn(async () => result);
  query.single = vi.fn(async () => result);
  query.select = vi.fn(() => query);

  return query;
}

function createSupabaseMock({
  existingTransactions,
}: {
  existingTransactions: Array<Record<string, unknown>>;
}) {
  const upserts: Array<Record<string, unknown>> = [];

  const client = {
    from: vi.fn((table: string) => {
      if (table === "plaid_ignored_transaction_ids") {
        return createQueryResult({ data: [], error: null });
      }

      if (table === "plaid_transaction_rules") {
        return createQueryResult({ data: [], error: null });
      }

      if (table === "workspaces") {
        return createQueryResult({
          data: { base_currency: "USD" },
          error: null,
        });
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

  return { client, upserts };
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
});
