import { NextResponse } from "next/server";

import {
  buildAlgoliaSearchRequest,
  getOntologyAlgoliaConfig,
  mapOntologyHits,
  parseOntologySearchParams,
} from "@/utils/ontology-associations";

export async function GET(request: Request) {
  const { query, limit } = parseOntologySearchParams(
    new URL(request.url).searchParams,
  );

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  const config = getOntologyAlgoliaConfig();

  if ("missing" in config) {
    return NextResponse.json(
      {
        error: {
          code: "ONTOLOGY_ALGOLIA_ENV_MISSING",
          missing: config.missing,
        },
      },
      { status: 500 },
    );
  }

  try {
    const { url, init } = buildAlgoliaSearchRequest(config, { query, limit });
    const response = await fetch(url, init);

    if (!response.ok) {
      console.error("Ontology Algolia search failed", {
        status: response.status,
        statusText: response.statusText,
      });

      return NextResponse.json(
        { error: { code: "ONTOLOGY_ALGOLIA_SEARCH_FAILED" } },
        { status: 502 },
      );
    }

    const data = (await response.json()) as { hits?: unknown[] };

    return NextResponse.json({ items: mapOntologyHits(data.hits ?? []) });
  } catch (error) {
    console.error("Ontology association search error", error);

    return NextResponse.json(
      { error: { code: "ONTOLOGY_ALGOLIA_SEARCH_FAILED" } },
      { status: 502 },
    );
  }
}
