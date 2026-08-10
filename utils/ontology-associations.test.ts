import { describe, expect, it } from "vitest";

import {
  buildAlgoliaObjectsRequest,
  buildAlgoliaSearchRequest,
  getOntologyAlgoliaConfig,
  haveSameOntologyAssociations,
  mapOntologyHits,
  parseOntologySearchParams,
  validateOntologyCardinality,
} from "./ontology-associations";

const config = {
  appId: "APP123",
  searchApiKey: "search-key",
  indexName: "ontology index",
};

describe("ontology association helpers", () => {
  it("parses workspace, supported types, query, and a clamped limit", () => {
    expect(
      parseOntologySearchParams(
        new URL(
          "http://localhost/search?workspaceId=workspace-1&q=alice&types=person,trip,invalid&limit=200",
        ).searchParams,
      ),
    ).toEqual({
      workspaceId: "workspace-1",
      query: "alice",
      types: ["person", "trip"],
      limit: 20,
    });
  });

  it("uses an empty query below two characters and all types by default", () => {
    expect(
      parseOntologySearchParams(
        new URL("http://localhost/search?workspaceId=workspace-1&q=a")
          .searchParams,
      ),
    ).toEqual({
      workspaceId: "workspace-1",
      query: "",
      types: ["person", "place", "organization", "trip"],
      limit: 8,
    });
  });

  it("requires dedicated ontology environment variables", () => {
    expect(
      getOntologyAlgoliaConfig({
        ALGOLIA_APP_ID: "generic-app",
        ALGOLIA_SEARCH_API_KEY: "generic-key",
        ALGOLIA_INDEX_NAME: "generic-index",
      }),
    ).toEqual({
      missing: [
        "ONTOLOGY_ALGOLIA_APP_ID",
        "ONTOLOGY_ALGOLIA_SEARCH_API_KEY",
        "ONTOLOGY_ALGOLIA_INDEX_NAME",
      ],
    });
  });

  it("builds a type-scoped search request", () => {
    expect(
      buildAlgoliaSearchRequest(config, {
        workspaceId: "workspace-1",
        query: "alice",
        types: ["person", "organization"],
        limit: 5,
      }),
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
          filters: "type:person OR type:organization",
        }),
      },
    });
  });

  it("builds a batch source-object verification request", () => {
    expect(buildAlgoliaObjectsRequest(config, ["one", "two"])).toEqual({
      url: "https://APP123-dsn.algolia.net/1/indexes/*/objects",
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Algolia-API-Key": "search-key",
          "X-Algolia-Application-Id": "APP123",
        },
        body: JSON.stringify({
          requests: [
            { indexName: "ontology index", objectID: "one" },
            { indexName: "ontology index", objectID: "two" },
          ],
        }),
      },
    });
  });

  it("maps all supported types and deduplicates canonical IDs", () => {
    expect(
      mapOntologyHits([
        {
          objectID: "person-1",
          workspaceId: "workspace-1",
          type: "person",
          canonicalName: "Ada Lovelace",
          ontologyId: "canonical-person",
        },
        {
          objectID: "person-duplicate",
          workspaceId: "workspace-1",
          type: "person",
          name: "Ada",
          ontologyId: "canonical-person",
        },
        {
          objectID: "org-1",
          workspaceId: "workspace-1",
          type: "organization",
          name: "Acme",
          ontology_id: "canonical-org",
        },
        {
          objectID: "trip-1",
          type: "trip",
          name: "Summer",
          ontologyId: "canonical-trip",
        },
      ]),
    ).toEqual([
      {
        sourceObjectId: "person-1",
        type: "person",
        name: "Ada Lovelace",
        ontologyId: "canonical-person",
      },
      {
        sourceObjectId: "org-1",
        type: "organization",
        name: "Acme",
        ontologyId: "canonical-org",
      },
      {
        sourceObjectId: "trip-1",
        type: "trip",
        name: "Summer",
        ontologyId: "canonical-trip",
      },
    ]);
  });

  it("validates people-many and singleton cardinalities", () => {
    expect(
      validateOntologyCardinality([
        { type: "person", ontologyId: "one" },
        { type: "person", ontologyId: "two" },
        { type: "trip", ontologyId: "trip" },
      ]),
    ).toBe(true);
    expect(
      validateOntologyCardinality([
        { type: "place", ontologyId: "one" },
        { type: "place", ontologyId: "two" },
      ]),
    ).toBe(false);
    expect(
      validateOntologyCardinality([
        { type: "person", ontologyId: "one" },
        { type: "person", ontologyId: "one" },
      ]),
    ).toBe(false);
  });

  it("compares association sets independently of display data and order", () => {
    expect(
      haveSameOntologyAssociations(
        [
          { type: "person", ontologyId: "person-1" },
          { type: "trip", ontologyId: "trip-1" },
        ],
        [
          { type: "trip", ontologyId: "trip-1" },
          { type: "person", ontologyId: "person-1" },
        ],
      ),
    ).toBe(true);
    expect(
      haveSameOntologyAssociations(
        [{ type: "person", ontologyId: "person-1" }],
        [{ type: "person", ontologyId: "person-2" }],
      ),
    ).toBe(false);
  });
});
