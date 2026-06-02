import { WalletInfographicsGrid } from "../(components)/wallet-infographics-grid";

import { createClient } from "@/utils/supabase/server";
import {
  DEFAULT_FEATURE_FLAGS,
  parseFeatureFlags,
} from "@/utils/types/feature-flags";

interface PageParams {
  params: Promise<{ walletId: string }>;
}

export const dynamic = "force-dynamic";

async function InfographicsPage({ params }: PageParams) {
  const { walletId } = await params;
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

  return (
    <WalletInfographicsGrid
      walletId={walletId}
      billsEnabled={featureFlags.bills_enabled}
    />
  );
}

export default InfographicsPage;
