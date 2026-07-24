import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { replaceTransactionOntologyAssociations } from "./ontology-associations";

import { createClient } from "@/utils/supabase/server";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockedCreateClient = vi.mocked(createClient);

function createAuthorizedSupabase(enabled = true) {
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
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data: rows[table] ?? null })),
      };
      return query;
    }),
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

  it("rejects a source object returned for another workspace", async () => {
    mockedCreateClient.mockResolvedValue(createAuthorizedSupabase() as never);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          results: [
            {
              objectID: "person-1",
              workspaceId: "workspace-2",
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
      success: false,
      error: {
        code: "ONTOLOGY_SOURCE_MISSING",
        message:
          "One or more canonical objects are unavailable in this workspace.",
      },
    });
  });
});
