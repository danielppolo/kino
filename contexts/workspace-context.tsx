"use client";

import React, { createContext, ReactNode, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { switchActiveWorkspace } from "@/utils/supabase/mutations";
import { listWallets } from "@/utils/supabase/queries";
import { FeatureFlags } from "@/utils/types/feature-flags";

export interface CurrencyConversion {
  rate: number;
  lastUpdated: string;
  source: "cache" | "api" | "direct";
}

export interface Workspace {
  id: string;
  name: string;
  icon: string | null;
  base_currency: string;
  feature_flags: FeatureFlags | null;
  created_at: string;
  updated_at: string;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "editor" | "reader";
  created_at: string;
}

interface WorkspaceContextType {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  workspaceMembers: WorkspaceMember[];
  conversionRates: Record<string, CurrencyConversion>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

interface WorkspaceProviderProps {
  children: ReactNode;
  userId: string;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({
  children,
  userId,
}) => {
  const queryClient = useQueryClient();

  // Fetch user's workspaces
  const {
    data: workspaces = [],
    isLoading: workspacesLoading,
    refetch: refetchWorkspaces,
  } = useQuery<Workspace[]>({
    queryKey: ["workspaces", userId],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("workspaces")
        .select(
          `
          *,
          workspace_members!inner(user_id)
        `,
        )
        .eq("workspace_members.user_id", userId)
        .order("name");

      if (error) throw error;
      const rows = (data || []) as Array<{ feature_flags?: unknown } & Omit<Workspace, "feature_flags">>;
      return rows.map((w) => ({
        ...w,
        feature_flags: w.feature_flags
          ? (w.feature_flags as Workspace["feature_flags"])
          : null,
      }));
    },
  });

  // Fetch user preferences to get active workspace
  const {
    data: userPreferences,
    isLoading: preferencesLoading,
    refetch: refetchPreferences,
  } = useQuery({
    queryKey: ["user-preferences", userId],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Determine active workspace
  const activeWorkspaceId = userPreferences?.active_workspace_id;
  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ||
    workspaces[0] ||
    null;

  // Fetch workspace members for the active workspace
  const { data: workspaceMembersRaw = [], refetch: refetchMembers } = useQuery({
    queryKey: ["workspace-members", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", activeWorkspace.id);

      if (error) throw error;
      return (data || []) as WorkspaceMember[];
    },
    enabled: !!activeWorkspace?.id,
  });
  const workspaceMembers = workspaceMembersRaw as WorkspaceMember[];

  // Fetch wallets for the active workspace
  const { data: wallets = [] } = useQuery({
    queryKey: ["workspace-wallets", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      const supabase = await createClient();
      const result = await listWallets(supabase, activeWorkspace.id);
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!activeWorkspace?.id,
  });

  // Extract unique currencies from wallets
  const walletCurrencies = React.useMemo(
    () => Array.from(new Set(wallets.map((w) => w.currency))),
    [wallets],
  );


  // Fetch conversion rates for all wallet currencies
  const { data: conversionRates = {} } = useQuery<
    Record<string, CurrencyConversion>
  >({
    queryKey: [
      "workspace-currency-conversions",
      activeWorkspace?.base_currency,
      walletCurrencies,
    ],
    queryFn: async () => {
      if (!activeWorkspace) return {};

      const baseCurrency = activeWorkspace.base_currency || "USD";

      // If no wallets or all wallets use base currency, return base currency only
      if (
        walletCurrencies.length === 0 ||
        (walletCurrencies.length === 1 && walletCurrencies[0] === baseCurrency)
      ) {
        return {
          [baseCurrency]: {
            rate: 1,
            lastUpdated: new Date().toISOString(),
            source: "direct",
          },
        };
      }

      const response = await fetch("/api/currency-conversions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currencies: walletCurrencies,
          baseCurrency,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch currency conversions");
      }

      const data = await response.json();
      return data.conversions;
    },
    // staleTime: 1000 * 60 * 60, // Consider rates fresh for 1 hour
    enabled: !!activeWorkspace && walletCurrencies.length > 0,
    initialData: {},
  });


  console.log(conversionRates);

  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      await switchActiveWorkspace(userId, workspaceId);

      // Invalidate all workspace-dependent queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-preferences"] }),
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["labels"] }),
        queryClient.invalidateQueries({ queryKey: ["tags"] }),
        queryClient.invalidateQueries({ queryKey: ["views"] }),
        queryClient.invalidateQueries({ queryKey: ["transaction-templates"] }),
        queryClient.invalidateQueries({ queryKey: ["wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-members"] }),
        queryClient.invalidateQueries({
          queryKey: ["workspace-currency-conversions"],
        }),
        queryClient.invalidateQueries({ queryKey: ["category-pie-chart"] }),
        queryClient.invalidateQueries({ queryKey: ["label-pie-chart"] }),
        queryClient.invalidateQueries({ queryKey: ["category-trends"] }),
        queryClient.invalidateQueries({ queryKey: ["label-area-chart"] }),
        queryClient.invalidateQueries({ queryKey: ["label-trends"] }),
        queryClient.invalidateQueries({ queryKey: ["expense-concentration"] }),
      ]);
    } catch (error) {
      console.error("Failed to switch workspace:", error);
      throw error;
    }
  };

  const refetch = async () => {
    await Promise.all([
      refetchWorkspaces(),
      refetchPreferences(),
      refetchMembers(),
    ]);
  };

  const value: WorkspaceContextType = {
    activeWorkspace,
    workspaces,
    workspaceMembers,
    conversionRates,
    switchWorkspace: handleSwitchWorkspace,
    isLoading: workspacesLoading || preferencesLoading,
    refetch,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
