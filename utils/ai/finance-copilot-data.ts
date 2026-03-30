import type { BillInsightsResult, WorkspaceContext } from "./finance-copilot-types";

import { Json } from "@/utils/supabase/database.types";
import {
  getBillBurdenRatio,
  getCashFlowAfterBills,
  listRealEstateAssets,
  listWallets,
} from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";
import {
  createEmptyFinanceMemory,
  type FinanceMemory,
  parseFinanceMemory,
} from "@/utils/types/finance-memory";

export async function resolveWorkspaceContext(): Promise<WorkspaceContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const [{ data: preferences, error: preferencesError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      supabase
        .from("user_preferences")
        .select("active_workspace_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(id, name, base_currency, finance_memory)")
        .eq("user_id", user.id),
    ]);

  if (preferencesError) throw preferencesError;
  if (membershipsError) throw membershipsError;

  const membershipRows =
    (memberships as Array<{
      workspace_id: string;
      workspaces: {
        id: string;
        name: string;
        base_currency: string | null;
        finance_memory?: unknown;
      } | null;
    }> | null) ?? [];

  const activeMembership =
    membershipRows.find(
      (membership) => membership.workspace_id === preferences?.active_workspace_id,
    ) ?? membershipRows[0];

  if (!activeMembership?.workspaces) {
    throw new Error("No active workspace found");
  }

  const [walletsResult, assetsResult] = await Promise.all([
    listWallets(supabase, activeMembership.workspace_id),
    listRealEstateAssets(supabase, activeMembership.workspace_id),
  ]);
  if (walletsResult.error) throw walletsResult.error;
  if (assetsResult.error) throw assetsResult.error;

  return {
    workspace: {
      ...activeMembership.workspaces,
      finance_memory: activeMembership.workspaces.finance_memory
        ? parseFinanceMemory(activeMembership.workspaces.finance_memory)
        : null,
    },
    wallets: walletsResult.data ?? [],
    realEstateAssets: assetsResult.data ?? [],
  };
}

export async function getBillInsights(
  client: Awaited<ReturnType<typeof createClient>>,
  params: {
    walletId?: string;
    from?: string;
    to?: string;
  },
): Promise<BillInsightsResult> {
  if (!params.walletId) {
    return {
      latestBillBurdenPercent: null,
      latestNetAfterBillsCents: null,
    };
  }

  try {
    const [billBurdenResult, cashFlowAfterBillsResult] = await Promise.all([
      getBillBurdenRatio(client, params),
      getCashFlowAfterBills(client, params),
    ]);

    if (billBurdenResult.error || cashFlowAfterBillsResult.error) {
      console.warn("Finance copilot bill insights unavailable", {
        billBurdenError: billBurdenResult.error,
        cashFlowAfterBillsError: cashFlowAfterBillsResult.error,
      });

      return {
        latestBillBurdenPercent: null,
        latestNetAfterBillsCents: null,
      };
    }

    return {
      latestBillBurdenPercent:
        (billBurdenResult.data ?? []).at(-1)?.burden_ratio ?? null,
      latestNetAfterBillsCents:
        (cashFlowAfterBillsResult.data ?? []).at(-1)?.net_after_bills_cents ?? null,
    };
  } catch (error) {
    console.warn("Finance copilot bill insights failed", error);
    return {
      latestBillBurdenPercent: null,
      latestNetAfterBillsCents: null,
    };
  }
}

export async function syncWorkspaceFinanceMemory(
  client: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  previousMemory: FinanceMemory | null,
  nextMemory: FinanceMemory,
) {
  const previousComparable = previousMemory
    ? {
        ...previousMemory.derived_context,
        last_derived_at: null,
      }
    : null;
  const nextComparable = {
    ...nextMemory.derived_context,
    last_derived_at: null,
  };

  if (
    previousMemory &&
    JSON.stringify(previousComparable) === JSON.stringify(nextComparable)
  ) {
    return;
  }

  const { error } = await client
    .from("workspaces")
    .update({ finance_memory: nextMemory as unknown as Json })
    .eq("id", workspaceId);

  if (error) {
    console.warn("Finance memory sync failed", error);
  }
}

export { createEmptyFinanceMemory };
