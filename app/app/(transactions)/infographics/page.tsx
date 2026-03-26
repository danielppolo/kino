import React from "react";

import {
  parseFeatureFlags,
  DEFAULT_FEATURE_FLAGS,
} from "@/utils/types/feature-flags";
import { createClient } from "@/utils/supabase/server";
import { Filters } from "@/utils/supabase/queries";
import { InfographicsTabs } from "./(components)/infographics-tabs";

interface PageParams {
  searchParams: Promise<Filters & { tab?: string }>;
}

export const dynamic = "force-dynamic";

async function InfographicsPage({ searchParams }: PageParams) {
  const filters = await searchParams;

  // Fetch feature flags from the active workspace
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: member } = user
    ? await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(feature_flags)")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  type WorkspaceWithFlags = { feature_flags?: unknown };
  const workspace = member?.workspaces as WorkspaceWithFlags | null;
  const featureFlags = workspace?.feature_flags
    ? parseFeatureFlags(workspace.feature_flags)
    : DEFAULT_FEATURE_FLAGS;

  const validTabs = [
    "overview",
    "transactions",
    "labels",
    "expenses",
    ...(featureFlags.infographics_autonomy_enabled ? ["autonomy"] : []),
  ];
  const defaultTab = validTabs.includes(filters.tab ?? "")
    ? filters.tab!
    : "overview";

  return (
    <InfographicsTabs
      filters={{ from: filters.from, to: filters.to }}
      autonomyEnabled={featureFlags.infographics_autonomy_enabled}
      defaultTab={defaultTab}
    />
  );
}

export default InfographicsPage;
