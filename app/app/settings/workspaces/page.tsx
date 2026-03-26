"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import {
  updateWorkspaceFeatureFlags,
  updateWorkspaceBaseCurrency,
} from "@/utils/supabase/mutations";
import {
  FeatureFlags,
  parseFeatureFlags,
  DEFAULT_FEATURE_FLAGS,
} from "@/utils/types/feature-flags";
import { useWorkspace } from "@/contexts/workspace-context";

type WorkspaceConfigFormState = {
  baseCurrency: "USD" | "MXN";
  featureFlags: FeatureFlags;
};

export default function WorkspacesPage() {
  const queryClient = useQueryClient();
  const { activeWorkspace, workspaceMembers } = useWorkspace();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [formState, setFormState] = useState<WorkspaceConfigFormState>({
    baseCurrency: "USD",
    featureFlags: DEFAULT_FEATURE_FLAGS,
  });

  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  const isOwner =
    activeWorkspace &&
    workspaceMembers.some(
      (m) =>
        m.workspace_id === activeWorkspace.id &&
        m.user_id === currentUserId &&
        m.role === "owner",
    );

  useEffect(() => {
    if (!activeWorkspace) return;

    const baseCurrency = (activeWorkspace.base_currency ?? "USD") as
      | "USD"
      | "MXN";
    const featureFlags = activeWorkspace.feature_flags
      ? parseFeatureFlags(activeWorkspace.feature_flags)
      : DEFAULT_FEATURE_FLAGS;

    setFormState({ baseCurrency, featureFlags });
  }, [activeWorkspace]);

  const updateWorkspaceConfigMutation = useMutation({
    mutationFn: async () => {
      if (!activeWorkspace) throw new Error("No active workspace");
      await updateWorkspaceBaseCurrency(activeWorkspace.id, formState.baseCurrency);
      await updateWorkspaceFeatureFlags(activeWorkspace.id, formState.featureFlags);
    },
    onSuccess: () => {
      toast.success("Workspace configuration updated successfully");
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-currency-conversions"] });
      window.location.reload();
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update workspace configuration");
      }
    },
  });

  const isDirty =
    !activeWorkspace
      ? false
      : activeWorkspace.base_currency !== formState.baseCurrency ||
        (activeWorkspace.feature_flags
          ? parseFeatureFlags(activeWorkspace.feature_flags).bills_enabled !==
            formState.featureFlags.bills_enabled
          : DEFAULT_FEATURE_FLAGS.bills_enabled !==
            formState.featureFlags.bills_enabled);

  const handleSave = () => {
    if (!isOwner) {
      toast.error("Only workspace owners can update configuration");
      return;
    }
    updateWorkspaceConfigMutation.mutate();
  };

  if (!activeWorkspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader>
        <div>
          <h2 className="text-2xl font-bold">Workspace Configuration</h2>
          <p className="text-muted-foreground text-sm">
            Configure settings for {activeWorkspace.name}
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateWorkspaceConfigMutation.isPending || !isDirty || !isOwner}
        >
          Save
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl space-y-8">
          {!isOwner && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Only workspace owners can modify these settings.
            </p>
          )}

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Currency</h3>
              <p className="text-muted-foreground text-sm">
                Base currency for this workspace. All amounts will be converted to this currency.
              </p>
            </div>
            <Select
              value={formState.baseCurrency}
              onValueChange={(value) =>
                setFormState((prev) => ({
                  ...prev,
                  baseCurrency: value as "USD" | "MXN",
                }))
              }
              disabled={!isOwner}
            >
              <SelectTrigger id="base-currency" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="MXN">MXN - Mexican Peso</SelectItem>
              </SelectContent>
            </Select>
          </section>

          <div className="border-t" />

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Features</h3>
              <p className="text-muted-foreground text-sm">
                Control which features are enabled in this workspace.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="bills-enabled" className="text-sm font-medium">
                    Bills Management
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Track and manage recurring and one-time bills
                  </p>
                </div>
                <Switch
                  id="bills-enabled"
                  checked={formState.featureFlags.bills_enabled}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      featureFlags: { ...prev.featureFlags, bills_enabled: checked },
                    }))
                  }
                  disabled={!isOwner}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autonomy-enabled" className="text-sm font-medium">
                    Autonomy Framework
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Show autonomy and financial independence charts in infographics
                  </p>
                </div>
                <Switch
                  id="autonomy-enabled"
                  checked={formState.featureFlags.infographics_autonomy_enabled}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      featureFlags: {
                        ...prev.featureFlags,
                        infographics_autonomy_enabled: checked,
                      },
                    }))
                  }
                  disabled={!isOwner}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
