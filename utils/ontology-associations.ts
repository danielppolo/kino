export type OntologyAssociationType = "person" | "place";

export interface OntologyAssociationItem {
  id: string;
  type: OntologyAssociationType;
  name: string;
  subtitle?: string;
  ontologyId: string;
}

export interface OntologySearchParams {
  query: string;
  limit: number;
}

export interface OntologyAlgoliaConfig {
  appId: string;
  searchApiKey: string;
  indexName: string;
}

export type OntologyAlgoliaConfigResult =
  | OntologyAlgoliaConfig
  | { missing: string[] };

type EnvMap = Record<string, string | undefined>;

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;
const MIN_QUERY_LENGTH = 2;
const TYPE_FILTER = "type:person OR type:place";

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

function clampLimit(value: string | null) {
  if (!value) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

export function parseOntologySearchParams(
  searchParams: URLSearchParams,
): OntologySearchParams {
  const rawQuery = searchParams.get("q") ?? searchParams.get("query") ?? "";
  const query = rawQuery.trim();

  return {
    query: query.length < MIN_QUERY_LENGTH ? "" : query,
    limit: clampLimit(searchParams.get("limit")),
  };
}

export function getOntologyAlgoliaConfig(
  env: EnvMap = process.env,
): OntologyAlgoliaConfigResult {
  const appId = firstValue(env.ONTOLOGY_ALGOLIA_APP_ID, env.ALGOLIA_APP_ID);
  const searchApiKey = firstValue(
    env.ONTOLOGY_ALGOLIA_SEARCH_API_KEY,
    env.ALGOLIA_SEARCH_API_KEY,
  );
  const indexName = firstValue(
    env.ONTOLOGY_ALGOLIA_INDEX_NAME,
    env.ALGOLIA_INDEX_NAME,
  );
  const missing = [
    !appId && "ONTOLOGY_ALGOLIA_APP_ID",
    !searchApiKey && "ONTOLOGY_ALGOLIA_SEARCH_API_KEY",
    !indexName && "ONTOLOGY_ALGOLIA_INDEX_NAME",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    return { missing };
  }

  return {
    appId: appId as string,
    searchApiKey: searchApiKey as string,
    indexName: indexName as string,
  };
}

export function buildAlgoliaSearchRequest(
  config: OntologyAlgoliaConfig,
  params: OntologySearchParams,
) {
  return {
    url: `https://${config.appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(config.indexName)}/query`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-API-Key": config.searchApiKey,
        "X-Algolia-Application-Id": config.appId,
      },
      body: JSON.stringify({
        query: params.query,
        hitsPerPage: params.limit,
        filters: TYPE_FILTER,
      }),
    },
  };
}

function isOntologyAssociationType(
  type: unknown,
): type is OntologyAssociationType {
  return type === "person" || type === "place";
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

export function mapOntologyHits(hits: unknown[]): OntologyAssociationItem[] {
  return hits.flatMap((hit) => {
    if (!hit || typeof hit !== "object") {
      return [];
    }

    const record = hit as Record<string, unknown>;
    const type = record.type;

    if (!isOntologyAssociationType(type)) {
      return [];
    }

    const id = readString(record, ["id", "objectID"]);
    const name = readString(record, ["canonicalName", "name", "title", "label"]);
    const ontologyId = readString(record, ["ontologyId", "ontology_id", "id", "objectID"]);

    if (!id || !name || !ontologyId) {
      return [];
    }

    const subtitle = readString(record, [
      "subtitle",
      "description",
      "displayPath",
      "location",
    ]);

    return [
      {
        id,
        type,
        name,
        ...(subtitle ? { subtitle } : {}),
        ontologyId,
      },
    ];
  });
}
