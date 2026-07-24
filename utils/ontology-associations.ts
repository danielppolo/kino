export const ONTOLOGY_ASSOCIATION_TYPES = [
  "person",
  "place",
  "organization",
  "trip",
] as const;

export type OntologyAssociationType =
  (typeof ONTOLOGY_ASSOCIATION_TYPES)[number];

export interface OntologyAssociationItem {
  sourceObjectId: string;
  type: OntologyAssociationType;
  name: string;
  subtitle?: string;
  ontologyId: string;
  entityId?: string;
}

export interface OntologySearchParams {
  workspaceId: string;
  query: string;
  limit: number;
  types: OntologyAssociationType[];
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

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

function clampLimit(value: string | null) {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

export function isOntologyAssociationType(
  type: unknown,
): type is OntologyAssociationType {
  return (
    typeof type === "string" &&
    ONTOLOGY_ASSOCIATION_TYPES.includes(type as OntologyAssociationType)
  );
}

function parseTypes(value: string | null): OntologyAssociationType[] {
  if (!value) return [...ONTOLOGY_ASSOCIATION_TYPES];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((type) => type.trim())
        .filter(isOntologyAssociationType),
    ),
  );
}

export function parseOntologySearchParams(
  searchParams: URLSearchParams,
): OntologySearchParams {
  const rawQuery = searchParams.get("q") ?? searchParams.get("query") ?? "";
  const query = rawQuery.trim();

  return {
    workspaceId: searchParams.get("workspaceId")?.trim() ?? "",
    query: query.length < MIN_QUERY_LENGTH ? "" : query,
    limit: clampLimit(searchParams.get("limit")),
    types: parseTypes(searchParams.get("types")),
  };
}

export function getOntologyAlgoliaConfig(
  env: EnvMap = process.env,
): OntologyAlgoliaConfigResult {
  const appId = firstValue(env.ONTOLOGY_ALGOLIA_APP_ID);
  const searchApiKey = firstValue(env.ONTOLOGY_ALGOLIA_SEARCH_API_KEY);
  const indexName = firstValue(env.ONTOLOGY_ALGOLIA_INDEX_NAME);
  const missing = [
    !appId && "ONTOLOGY_ALGOLIA_APP_ID",
    !searchApiKey && "ONTOLOGY_ALGOLIA_SEARCH_API_KEY",
    !indexName && "ONTOLOGY_ALGOLIA_INDEX_NAME",
  ].filter(Boolean) as string[];

  if (missing.length > 0) return { missing };
  return { appId: appId!, searchApiKey: searchApiKey!, indexName: indexName! };
}

function escapeFilterValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function buildOntologyFilter(
  workspaceId: string,
  types: OntologyAssociationType[],
) {
  const typeFilter = types.map((type) => `type:${type}`).join(" OR ");
  return `workspaceId:"${escapeFilterValue(workspaceId)}" AND (${typeFilter})`;
}

function buildRequestInit(config: OntologyAlgoliaConfig, body: unknown) {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Algolia-API-Key": config.searchApiKey,
      "X-Algolia-Application-Id": config.appId,
    },
    body: JSON.stringify(body),
  };
}

export function buildAlgoliaSearchRequest(
  config: OntologyAlgoliaConfig,
  params: OntologySearchParams,
) {
  return {
    url: `https://${config.appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(config.indexName)}/query`,
    init: buildRequestInit(config, {
      query: params.query,
      hitsPerPage: params.limit,
      filters: buildOntologyFilter(params.workspaceId, params.types),
    }),
  };
}

export function buildAlgoliaObjectsRequest(
  config: OntologyAlgoliaConfig,
  sourceObjectIds: string[],
) {
  return {
    url: `https://${config.appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(config.indexName)}/objects`,
    init: buildRequestInit(config, {
      requests: sourceObjectIds.map((objectID) => ({ objectID })),
    }),
  };
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function mapOntologyHits(
  hits: unknown[],
  expectedWorkspaceId?: string,
): OntologyAssociationItem[] {
  const seen = new Set<string>();

  return hits.flatMap((hit) => {
    if (!hit || typeof hit !== "object") return [];
    const record = hit as Record<string, unknown>;
    const type = record.type;
    if (!isOntologyAssociationType(type)) return [];

    const workspaceId = readString(record, ["workspaceId", "workspace_id"]);
    if (expectedWorkspaceId && workspaceId !== expectedWorkspaceId) return [];

    const sourceObjectId = readString(record, ["objectID", "id"]);
    const name = readString(record, [
      "canonicalName",
      "name",
      "title",
      "label",
    ]);
    const ontologyId = readString(record, [
      "ontologyId",
      "ontology_id",
      "canonicalId",
    ]);
    if (!sourceObjectId || !name || !ontologyId) return [];

    const key = `${type}:${ontologyId}`;
    if (seen.has(key)) return [];
    seen.add(key);

    const subtitle = readString(record, [
      "subtitle",
      "description",
      "displayPath",
      "location",
    ]);

    return [
      {
        sourceObjectId,
        type,
        name,
        ...(subtitle ? { subtitle } : {}),
        ontologyId,
      },
    ];
  });
}

export function validateOntologyCardinality(
  items: Pick<OntologyAssociationItem, "ontologyId" | "type">[],
) {
  const seen = new Set<string>();
  const singletonTypes = new Set<OntologyAssociationType>([
    "place",
    "organization",
    "trip",
  ]);
  const singletonCounts = new Map<OntologyAssociationType, number>();

  for (const item of items) {
    if (!isOntologyAssociationType(item.type)) return false;
    const key = `${item.type}:${item.ontologyId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (singletonTypes.has(item.type)) {
      const count = (singletonCounts.get(item.type) ?? 0) + 1;
      if (count > 1) return false;
      singletonCounts.set(item.type, count);
    }
  }

  return true;
}

export function parseStoredOntologyAssociations(
  value: unknown,
): OntologyAssociationItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (
      !isOntologyAssociationType(record.type) ||
      typeof record.sourceObjectId !== "string" ||
      typeof record.ontologyId !== "string" ||
      typeof record.name !== "string"
    ) {
      return [];
    }

    return [
      {
        sourceObjectId: record.sourceObjectId,
        ontologyId: record.ontologyId,
        type: record.type,
        name: record.name,
        ...(typeof record.subtitle === "string"
          ? { subtitle: record.subtitle }
          : {}),
        ...(typeof record.entityId === "string"
          ? { entityId: record.entityId }
          : {}),
      },
    ];
  });
}

export function haveSameOntologyAssociations(
  left: Pick<OntologyAssociationItem, "ontologyId" | "type">[],
  right: Pick<OntologyAssociationItem, "ontologyId" | "type">[],
) {
  if (left.length !== right.length) return false;

  const toKeys = (
    items: Pick<OntologyAssociationItem, "ontologyId" | "type">[],
  ) => items.map((item) => `${item.type}:${item.ontologyId}`).sort();
  const leftKeys = toKeys(left);
  const rightKeys = toKeys(right);

  return leftKeys.every((key, index) => key === rightKeys[index]);
}
