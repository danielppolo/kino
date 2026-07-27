import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

import { createClient } from "@/utils/supabase/server";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

const mockedCreateClient = vi.mocked(createClient);

function createSupabase({
  user = { id: "user-1" } as { id: string } | null,
  membership = { workspace_id: "workspace-1" } as {
    workspace_id: string;
  } | null,
  enabled = true,
} = {}) {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user } })),
    },
    from: vi.fn((table: string) => {
      type QueryMock = {
        select: ReturnType<typeof vi.fn>;
        eq: ReturnType<typeof vi.fn>;
        maybeSingle: ReturnType<typeof vi.fn>;
      };
      const query: QueryMock = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () =>
          table === "workspace_members"
            ? { data: membership }
            : {
                data: {
                  feature_flags: {
                    bills_enabled: true,
                    ontology_associations_enabled: enabled,
                  },
                },
              },
        ),
      };
      return query;
    }),
  };
}

function request(query: string) {
  return new Request(
    `http://localhost/api/ontology-associations/search?workspaceId=workspace-1&${query}`,
  );
}

describe("ontology association search route", () => {
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

  it("requires authentication", async () => {
    mockedCreateClient.mockResolvedValue(
      createSupabase({ user: null }) as never,
    );
    const response = await GET(request("q=alice"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("rejects a non-member and a disabled workspace before Algolia", async () => {
    mockedCreateClient.mockResolvedValue(
      createSupabase({ membership: null }) as never,
    );
    expect((await GET(request("q=alice"))).status).toBe(403);

    mockedCreateClient.mockResolvedValue(
      createSupabase({ enabled: false }) as never,
    );
    const response = await GET(request("q=alice"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: "ONTOLOGY_ASSOCIATIONS_DISABLED" },
    });
  });

  it("returns a stable result after local workspace authorization", async () => {
    mockedCreateClient.mockResolvedValue(createSupabase() as never);
    const fetchMock = vi.fn(async () =>
      Response.json({
        hits: [
          {
            objectID: "person-1",
            type: "person",
            name: "Alice",
            ontologyId: "canonical-person",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(request("q=alice&types=person&limit=5"));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://APP123-dsn.algolia.net/1/indexes/ontology/query",
      expect.objectContaining({
        body: JSON.stringify({
          query: "alice",
          hitsPerPage: 5,
          filters: "type:person",
        }),
      }),
    );
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          sourceObjectId: "person-1",
          type: "person",
          name: "Alice",
          ontologyId: "canonical-person",
        },
      ],
    });
  });

  it("does not expose configured values in missing-config errors", async () => {
    mockedCreateClient.mockResolvedValue(createSupabase() as never);
    vi.stubEnv("ONTOLOGY_ALGOLIA_SEARCH_API_KEY", "");
    const response = await GET(request("q=alice"));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "ONTOLOGY_ALGOLIA_ENV_MISSING",
        missing: ["ONTOLOGY_ALGOLIA_SEARCH_API_KEY"],
      },
    });
  });
});
