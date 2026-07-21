import { describe, expect, it, vi } from "vitest";

import {
  buildAlgoliaSearchRequest,
  getOntologyAlgoliaConfig,
  mapOntologyHits,
  parseOntologySearchParams,
} from "./ontology-associations";

describe("ontology association search helpers", () => {
  it("returns an empty query for blank or one-character input", () => {
    expect(
      parseOntologySearchParams(
        new URL("http://localhost/api/ontology-associations/search?q=a")
          .searchParams,
      ),
    ).toEqual({ query: "", limit: 8 });

    expect(
      parseOntologySearchParams(
        new URL("http://localhost/api/ontology-associations/search?query=%20")
          .searchParams,
      ),
    ).toEqual({ query: "", limit: 8 });
  });

  it("trims q or query and clamps limit to the supported range", () => {
    expect(
      parseOntologySearchParams(
        new URL(
          "http://localhost/api/ontology-associations/search?query=alice&limit=200",
        ).searchParams,
      ),
    ).toEqual({ query: "alice", limit: 20 });

    expect(
      parseOntologySearchParams(
        new URL(
          "http://localhost/api/ontology-associations/search?q=paris&limit=0",
        ).searchParams,
      ),
    ).toEqual({ query: "paris", limit: 1 });
  });

  it("uses ontology Algolia env vars with generic Algolia names as fallback", () => {
    expect(
      getOntologyAlgoliaConfig({
        ONTOLOGY_ALGOLIA_APP_ID: "ontology-app",
        ONTOLOGY_ALGOLIA_SEARCH_API_KEY: "ontology-key",
        ONTOLOGY_ALGOLIA_INDEX_NAME: "ontology-index",
        ALGOLIA_APP_ID: "fallback-app",
        ALGOLIA_SEARCH_API_KEY: "fallback-key",
        ALGOLIA_INDEX_NAME: "fallback-index",
      }),
    ).toEqual({
      appId: "ontology-app",
      searchApiKey: "ontology-key",
      indexName: "ontology-index",
    });

    expect(
      getOntologyAlgoliaConfig({
        ALGOLIA_APP_ID: "fallback-app",
        ALGOLIA_SEARCH_API_KEY: "fallback-key",
        ALGOLIA_INDEX_NAME: "fallback-index",
      }),
    ).toEqual({
      appId: "fallback-app",
      searchApiKey: "fallback-key",
      indexName: "fallback-index",
    });
  });

  it("returns missing keys without exposing configured values", () => {
    expect(
      getOntologyAlgoliaConfig({
        ONTOLOGY_ALGOLIA_APP_ID: "ontology-app",
      }),
    ).toEqual({
      missing: [
        "ONTOLOGY_ALGOLIA_SEARCH_API_KEY",
        "ONTOLOGY_ALGOLIA_INDEX_NAME",
      ],
    });
  });

  it("builds a server-side Algolia REST search request for people and places", () => {
    expect(
      buildAlgoliaSearchRequest(
        {
          appId: "APP123",
          searchApiKey: "search-key",
          indexName: "ontology index",
        },
        { query: "alice", limit: 5 },
      ),
    ).toEqual({
      url: "https://APP123-dsn.algolia.net/1/indexes/ontology%20index/query",
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Algolia-API-Key": "search-key",
          "X-Algolia-Application-Id": "APP123",
        },
        body: JSON.stringify({
          query: "alice",
          hitsPerPage: 5,
          filters: "type:person OR type:place",
        }),
      },
    });
  });

  it("maps only person and place hits to the stable response shape", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      mapOntologyHits([
        {
          objectID: "person-1",
          type: "person",
          canonicalName: "Ada Lovelace",
          ontologyId: "ont-person-1",
        },
        {
          objectID: "org-1",
          type: "organization",
          name: "Acme",
        },
        {
          objectID: "place-1",
          type: "place",
          title: "Paris",
          description: "France",
          ontology_id: "ont-place-1",
        },
        {
          objectID: "missing-name",
          type: "person",
        },
      ]),
    ).toEqual([
      {
        id: "person-1",
        type: "person",
        name: "Ada Lovelace",
        ontologyId: "ont-person-1",
      },
      {
        id: "place-1",
        type: "place",
        name: "Paris",
        subtitle: "France",
        ontologyId: "ont-place-1",
      },
    ]);

    warn.mockRestore();
  });
});
