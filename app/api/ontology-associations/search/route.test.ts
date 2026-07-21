import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

function request(url: string) {
  return new Request(url);
}

describe("ontology association search route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns an empty result for short queries without requiring Algolia env vars", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      request("http://localhost/api/ontology-associations/search?q=a"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ items: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a clear 500 error when Algolia env vars are missing", async () => {
    vi.stubEnv("ONTOLOGY_ALGOLIA_APP_ID", "");
    vi.stubEnv("ONTOLOGY_ALGOLIA_SEARCH_API_KEY", "");
    vi.stubEnv("ONTOLOGY_ALGOLIA_INDEX_NAME", "");
    vi.stubEnv("ALGOLIA_APP_ID", "");
    vi.stubEnv("ALGOLIA_SEARCH_API_KEY", "");
    vi.stubEnv("ALGOLIA_INDEX_NAME", "");

    const response = await GET(
      request("http://localhost/api/ontology-associations/search?q=alice"),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "ONTOLOGY_ALGOLIA_ENV_MISSING",
        missing: [
          "ONTOLOGY_ALGOLIA_APP_ID",
          "ONTOLOGY_ALGOLIA_SEARCH_API_KEY",
          "ONTOLOGY_ALGOLIA_INDEX_NAME",
        ],
      },
    });
  });

  it("searches Algolia with people/place filters and returns stable items", async () => {
    vi.stubEnv("ONTOLOGY_ALGOLIA_APP_ID", "APP123");
    vi.stubEnv("ONTOLOGY_ALGOLIA_SEARCH_API_KEY", "search-key");
    vi.stubEnv("ONTOLOGY_ALGOLIA_INDEX_NAME", "ontology");

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          hits: [
            {
              objectID: "person-1",
              type: "person",
              name: "Alice Smith",
              subtitle: "Friend",
              ontologyId: "ont-person-1",
            },
            {
              objectID: "company-1",
              type: "organization",
              name: "Acme",
              ontologyId: "ont-company-1",
            },
            {
              objectID: "place-1",
              type: "place",
              name: "Paris",
              ontologyId: "ont-place-1",
            },
          ],
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      request(
        "http://localhost/api/ontology-associations/search?query=alice&limit=5",
      ),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://APP123-dsn.algolia.net/1/indexes/ontology/query",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Algolia-API-Key": "search-key",
          "X-Algolia-Application-Id": "APP123",
        }),
        body: JSON.stringify({
          query: "alice",
          hitsPerPage: 5,
          filters: "type:person OR type:place",
        }),
      }),
    );
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          id: "person-1",
          type: "person",
          name: "Alice Smith",
          subtitle: "Friend",
          ontologyId: "ont-person-1",
        },
        {
          id: "place-1",
          type: "place",
          name: "Paris",
          ontologyId: "ont-place-1",
        },
      ],
    });
  });
});
