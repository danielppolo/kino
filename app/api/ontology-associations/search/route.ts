import { NextResponse } from "next/server";

import {
  buildAlgoliaSearchRequest,
  getOntologyAlgoliaConfig,
  mapOntologyHits,
  parseOntologySearchParams,
} from "@/utils/ontology-associations";
import { createClient } from "@/utils/supabase/server";
import {
  DEFAULT_FEATURE_FLAGS,
  parseFeatureFlags,
} from "@/utils/types/feature-flags";

function errorResponse(code: string, status: number, extra = {}) {
  return NextResponse.json({ error: { code, ...extra } }, { status });
}

export async function GET(request: Request) {
  const params = parseOntologySearchParams(new URL(request.url).searchParams);

  if (!params.workspaceId) return errorResponse("WORKSPACE_REQUIRED", 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("UNAUTHORIZED", 401);

  const [{ data: membership }, { data: workspace }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("workspaces")
      .select("feature_flags")
      .eq("id", params.workspaceId)
      .maybeSingle(),
  ]);

  if (!membership || !workspace) return errorResponse("FORBIDDEN", 403);
  const flags = workspace.feature_flags
    ? parseFeatureFlags(workspace.feature_flags)
    : DEFAULT_FEATURE_FLAGS;
  if (!flags.ontology_associations_enabled) {
    return errorResponse("ONTOLOGY_ASSOCIATIONS_DISABLED", 403);
  }
  if (!params.query || params.types.length === 0) {
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
    const { url, init } = buildAlgoliaSearchRequest(config, params);
    console.log("url", url);
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

    return NextResponse.json({
      items: mapOntologyHits(data.hits ?? []),
    });
  } catch (error) {
    console.error("Ontology association search error", error);

    return NextResponse.json(
      { error: { code: "ONTOLOGY_ALGOLIA_SEARCH_FAILED" } },
      { status: 502 },
    );
  }
}
