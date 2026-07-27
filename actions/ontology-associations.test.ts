import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { replaceTransactionOntologyAssociations } from "./ontology-associations";

import { createClient } from "@/utils/supabase/server";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockedCreateClient = vi.mocked(createClient);

function createAuthorizedSupabase(enabled = true) {
  const ontologyUpsert = vi.fn();
  const rows: Record<string, unknown> = {
    transactions: { id: "transaction-1", wallet_id: "wallet-1" },
    wallets: { workspace_id: "workspace-1" },
    user_wallets: { role: "editor" },
    workspaces: {
      feature_flags: {
        bills_enabled: true,
        ontology_associations_enabled: enabled,
      },
    },
  };

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1" } },
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "ontology_entities") {
        return {
          upsert: ontologyUpsert.mockImplementation(() => ({
            select: vi.fn(async () => ({
              data: [
                {
                  id: "entity-1",
                  entity_type: "person",
                  ontology_id: "canonical-person",
                  source_object_id: "person-1",
                  canonical_name: "Alice",
                  subtitle: null,
                },
              ],
              error: null,
            })),
          })),
        };
      }
      if (table === "transaction_ontology_associations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: [], error: null })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
          insert: vi.fn(async () => ({ error: null })),
        };
      }

      type QueryMock = {
        eq: ReturnType<typeof vi.fn>;
        in: ReturnType<typeof vi.fn>;
        maybeSingle: ReturnType<typeof vi.fn>;
        select: ReturnType<typeof vi.fn>;
      };
      const query: QueryMock = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data: rows[table] ?? null })),
      };
      return query;
    }),
    ontologyUpsert,
  };
}

describe("replaceTransactionOntologyAssociations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ONTOLOGY_ALGOLIA_APP_ID", "APP123");
    vi.stubEnv("ONTOLOGY_ALGOLIA_SEARCH_API_KEY", "search-key");
    vi.stubEnv("ONTOLOGY_ALGOLIA_INDEX_NAME", "ontology");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects invalid singleton cardinality before accessing the database", async () => {
    const result = await replaceTransactionOntologyAssociations(
      "transaction-1",
      [
        {
          sourceObjectId: "place-1",
          ontologyId: "canonical-place-1",
          type: "place",
          name: "Paris",
        },
        {
          sourceObjectId: "place-2",
          ontologyId: "canonical-place-2",
          type: "place",
          name: "London",
        },
      ],
    );

    expect(result).toEqual({
      success: false,
      error: {
        code: "INVALID_CARDINALITY",
        message:
          "People may be selected more than once, but trips, places, and organizations are limited to one each.",
      },
    });
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("preserves data while the workspace feature is disabled", async () => {
    const supabase = createAuthorizedSupabase(false);
    mockedCreateClient.mockResolvedValue(supabase as never);

    const result = await replaceTransactionOntologyAssociations(
      "transaction-1",
      [],
    );

    expect(result).toEqual({
      success: false,
      error: {
        code: "ONTOLOGY_ASSOCIATIONS_DISABLED",
        message:
          "Canonical transaction context is disabled for this workspace.",
      },
    });
    expect(supabase.from).not.toHaveBeenCalledWith(
      "transaction_ontology_associations",
    );
  });

  it("accepts a verified source object without workspace metadata", async () => {
    const supabase = createAuthorizedSupabase();
    mockedCreateClient.mockResolvedValue(supabase as never);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          results: [
            {
              objectID: "person-1",
              ontologyId: "canonical-person",
              type: "person",
              name: "Alice",
            },
          ],
        }),
      ),
    );

    const result = await replaceTransactionOntologyAssociations(
      "transaction-1",
      [
        {
          sourceObjectId: "person-1",
          ontologyId: "canonical-person",
          type: "person",
          name: "Spoofed Alice",
        },
      ],
    );

    expect(result).toEqual({
      success: true,
      items: [
        {
          sourceObjectId: "person-1",
          ontologyId: "canonical-person",
          type: "person",
          name: "Alice",
          entityId: "entity-1",
        },
      ],
    });
    expect(supabase.ontologyUpsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          workspace_id: "workspace-1",
          source_object_id: "person-1",
        }),
      ],
      { onConflict: "workspace_id,entity_type,ontology_id" },
    );
  });
});
