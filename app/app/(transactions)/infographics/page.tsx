import React from "react";

import { InfographicsTabs } from "./(components)/infographics-tabs";

import { Filters } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";
import {
  DEFAULT_FEATURE_FLAGS,
  parseFeatureFlags,
} from "@/utils/types/feature-flags";

interface PageParams {
  searchParams: Promise<Filters & { tab?: string }>;
}

// export const dynamic = "force-dynamic";

async function InfographicsPage({ searchParams }: PageParams) {
  const filters = await searchParams;

  // Fetch feature flags from the active workspace
  const supabase = await createClient();
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("active_workspace_id")
    .maybeSingle();

  const workspaceId = prefs?.active_workspace_id;
  const { data: workspace } = workspaceId
    ? await supabase
        .from("workspaces")
        .select("feature_flags")
        .eq("id", workspaceId)
        .maybeSingle()
    : { data: null };

  const featureFlags = workspace?.feature_flags
    ? parseFeatureFlags(workspace.feature_flags)
    : DEFAULT_FEATURE_FLAGS;

  const validTabs = [
    "overview",
    "transactions",
    "expenses",
    ...(featureFlags.bills_enabled ? ["bills"] : []),
    ...(featureFlags.infographics_autonomy_enabled ? ["autonomy"] : []),
  ];
  const defaultTab = validTabs.includes(filters.tab ?? "")
    ? filters.tab!
    : "overview";

  return (
    <InfographicsTabs
      filters={{ from: filters.from, to: filters.to }}
      billsEnabled={featureFlags.bills_enabled}
      autonomyEnabled={featureFlags.infographics_autonomy_enabled}
      defaultTab={defaultTab}
    />
  );
}

export default InfographicsPage;
