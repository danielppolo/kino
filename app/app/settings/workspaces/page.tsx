"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useWorkspace } from "@/contexts/workspace-context";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { createClient } from "@/utils/supabase/client";
import {
  updateWorkspaceBaseCurrency,
  updateWorkspaceFeatureFlags,
} from "@/utils/supabase/mutations";
import {
  DEFAULT_FEATURE_FLAGS,
  FeatureFlags,
  parseFeatureFlags,
} from "@/utils/types/feature-flags";

type BaseCurrency = "USD" | "MXN";
type EditableFeatureFlag =
  | "bills_enabled"
  | "infographics_autonomy_enabled"
  | "ontology_associations_enabled";

type WorkspaceConfigState = {
  baseCurrency: BaseCurrency;
  featureFlags: FeatureFlags;
};

const FEATURE_SETTINGS: Array<{
  description: string;
  id: string;
  key: EditableFeatureFlag;
  title: string;
}> = [
  {
    id: "bills-enabled",
    key: "bills_enabled",
    title: "Bills Management",
    description: "Track and manage recurring and one-time bills.",
  },
  {
    id: "autonomy-enabled",
    key: "infographics_autonomy_enabled",
    title: "Autonomy Framework",
    description:
      "Show autonomy and financial independence charts in Infographics.",
  },
  {
    id: "ontology-associations-enabled",
    key: "ontology_associations_enabled",
    title: "Canonical Transaction Context",
    description:
      "Associate canonical people, trips, places, and organizations with transactions.",
  },
];

export default function WorkspacesPage() {
  const queryClient = useQueryClient();
  const { activeWorkspace, workspaceMembers } = useWorkspace();
  const [currentUserId, setCurrentUserId] = useState("");
  const [isPermissionLoading, setIsPermissionLoading] = useState(true);
  const [config, setConfig] = useState<WorkspaceConfigState>({
    baseCurrency: "USD",
    featureFlags: DEFAULT_FEATURE_FLAGS,
  });

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
      } finally {
        setIsPermissionLoading(false);
      }
    };
    void getCurrentUser();
  }, []);

  const isOwner = Boolean(
    activeWorkspace &&
      workspaceMembers.some(
        (member) =>
          member.workspace_id === activeWorkspace.id &&
          member.user_id === currentUserId &&
          member.role === "owner",
      ),
  );

  useEffect(() => {
    if (!activeWorkspace) return;

    setConfig({
      baseCurrency: (activeWorkspace.base_currency ?? "USD") as BaseCurrency,
      featureFlags: activeWorkspace.feature_flags
        ? parseFeatureFlags(activeWorkspace.feature_flags)
        : DEFAULT_FEATURE_FLAGS,
    });
  }, [activeWorkspace]);

  const baseCurrencyMutation = useMutation({
    mutationFn: async ({
      next,
    }: {
      next: BaseCurrency;
      previous: BaseCurrency;
    }) => {
      if (!activeWorkspace) throw new Error("No active workspace");
      await updateWorkspaceBaseCurrency(activeWorkspace.id, next);
    },
    onMutate: ({ next }) => {
      setConfig((current) => ({ ...current, baseCurrency: next }));
    },
    onSuccess: () => {
      toast.success("Base currency updated");
    },
    onError: (error, { previous }) => {
      setConfig((current) => ({ ...current, baseCurrency: previous }));
      toast.error(
        error instanceof Error ? error.message : "Failed to update currency",
      );
    },
    onSettled: () => {
      void invalidateWorkspaceQueries(queryClient);
    },
  });

  const featureFlagsMutation = useMutation({
    mutationFn: async ({
      next,
    }: {
      next: FeatureFlags;
      previous: FeatureFlags;
    }) => {
      if (!activeWorkspace) throw new Error("No active workspace");
      await updateWorkspaceFeatureFlags(activeWorkspace.id, next);
    },
    onMutate: ({ next }) => {
      setConfig((current) => ({ ...current, featureFlags: next }));
    },
    onSuccess: () => {
      toast.success("Feature setting updated");
    },
    onError: (error, { previous }) => {
      setConfig((current) => ({ ...current, featureFlags: previous }));
      toast.error(
        error instanceof Error ? error.message : "Failed to update feature",
      );
    },
    onSettled: () => {
      void invalidateWorkspaceQueries(queryClient);
    },
  });

  if (!activeWorkspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading workspace…</p>
      </div>
    );
  }

  const controlsDisabled = isPermissionLoading || !isOwner;

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="max-w-3xl space-y-10">
        {!isPermissionLoading && !isOwner ? (
          <p className="text-muted-foreground text-sm">
            Only workspace owners can modify these settings.
          </p>
        ) : null}

        <section aria-labelledby="currency-settings" className="space-y-3">
          <div>
            <h2 id="currency-settings" className="text-base font-semibold">
              Currency
            </h2>
            <p className="text-muted-foreground text-sm">
              Configure how values are reported across this workspace.
            </p>
          </div>

          <ItemGroup>
            <Item role="listitem" size="sm">
              <ItemContent>
                <ItemTitle>Base Currency</ItemTitle>
                <ItemDescription>
                  All amounts are converted to this currency.
                </ItemDescription>
              </ItemContent>
              <ItemActions className="shrink-0">
                <Label htmlFor="base-currency" className="sr-only">
                  Base Currency
                </Label>
                <Select
                  value={config.baseCurrency}
                  onValueChange={(value: BaseCurrency) =>
                    baseCurrencyMutation.mutate({
                      next: value,
                      previous: config.baseCurrency,
                    })
                  }
                  disabled={controlsDisabled || baseCurrencyMutation.isPending}
                >
                  <SelectTrigger id="base-currency" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="MXN">MXN</SelectItem>
                  </SelectContent>
                </Select>
              </ItemActions>
            </Item>
          </ItemGroup>
        </section>

        <section aria-labelledby="feature-settings" className="space-y-3">
          <div>
            <h2 id="feature-settings" className="text-base font-semibold">
              Features
            </h2>
            <p className="text-muted-foreground text-sm">
              Control which capabilities are available in this workspace.
            </p>
          </div>

          <ItemGroup>
            {FEATURE_SETTINGS.map((setting, index) => (
              <div key={setting.key} role="listitem">
                {index > 0 ? <ItemSeparator /> : null}
                <Item size="sm">
                  <ItemContent>
                    <ItemTitle>
                      <Label htmlFor={setting.id}>{setting.title}</Label>
                    </ItemTitle>
                    <ItemDescription>{setting.description}</ItemDescription>
                  </ItemContent>
                  <ItemActions className="shrink-0">
                    <Switch
                      id={setting.id}
                      checked={config.featureFlags[setting.key]}
                      onCheckedChange={(checked) => {
                        const previous = config.featureFlags;
                        featureFlagsMutation.mutate({
                          previous,
                          next: { ...previous, [setting.key]: checked },
                        });
                      }}
                      disabled={
                        controlsDisabled || featureFlagsMutation.isPending
                      }
                    />
                  </ItemActions>
                </Item>
              </div>
            ))}
          </ItemGroup>
        </section>
      </div>
    </div>
  );
}
