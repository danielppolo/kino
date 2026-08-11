"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  updateUserPreferences,
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

type PreferencesState = {
  baseCurrency: BaseCurrency;
  featureFlags: FeatureFlags;
  phone: string;
  userId: string | null;
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

export default function PreferencesPage() {
  const queryClient = useQueryClient();
  const { activeWorkspace, workspaceMembers } = useWorkspace();
  const [state, setState] = useState<PreferencesState>({
    baseCurrency: "USD",
    featureFlags: DEFAULT_FEATURE_FLAGS,
    phone: "",
    userId: null,
  });

  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ["user-preferences", activeWorkspace?.id],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: userPreferences, error } = await supabase
        .from("user_preferences")
        .select("user_id, phone")
        .maybeSingle();

      if (error) throw new Error(error.message);

      return {
        baseCurrency: (activeWorkspace?.base_currency ?? "USD") as BaseCurrency,
        featureFlags: activeWorkspace?.feature_flags
          ? parseFeatureFlags(activeWorkspace.feature_flags)
          : DEFAULT_FEATURE_FLAGS,
        phone: userPreferences?.phone ?? "",
        userId: userPreferences?.user_id ?? user?.id ?? null,
      };
    },
    enabled: Boolean(activeWorkspace),
  });

  useEffect(() => {
    if (preferencesData) setState(preferencesData);
  }, [preferencesData]);

  const isOwner = Boolean(
    activeWorkspace &&
      state.userId &&
      workspaceMembers.some(
        (member) =>
          member.workspace_id === activeWorkspace.id &&
          member.user_id === state.userId &&
          member.role === "owner",
      ),
  );

  const phoneMutation = useMutation({
    mutationFn: async () => {
      if (!state.userId) throw new Error("User not found");
      await updateUserPreferences({
        userId: state.userId,
        phone: state.phone.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Preferences updated");
      void queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update preferences",
      );
    },
  });

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
      setState((current) => ({ ...current, baseCurrency: next }));
    },
    onSuccess: () => toast.success("Base currency updated"),
    onError: (error, { previous }) => {
      setState((current) => ({ ...current, baseCurrency: previous }));
      toast.error(
        error instanceof Error ? error.message : "Failed to update currency",
      );
    },
    onSettled: () => void invalidateWorkspaceQueries(queryClient),
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
      setState((current) => ({ ...current, featureFlags: next }));
    },
    onSuccess: () => toast.success("Feature setting updated"),
    onError: (error, { previous }) => {
      setState((current) => ({ ...current, featureFlags: previous }));
      toast.error(
        error instanceof Error ? error.message : "Failed to update feature",
      );
    },
    onSettled: () => void invalidateWorkspaceQueries(queryClient),
  });

  const phoneIsDirty = useMemo(
    () => Boolean(preferencesData && preferencesData.phone !== state.phone),
    [preferencesData, state.phone],
  );

  if (!activeWorkspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading workspace…</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="max-w-3xl space-y-10">
        {!isLoading && !isOwner ? (
          <p className="text-muted-foreground text-sm">
            Only workspace owners can modify workspace settings.
          </p>
        ) : null}

        <section aria-labelledby="personal-settings" className="space-y-3">
          <div>
            <h2 id="personal-settings" className="text-base font-semibold">
              Personal
            </h2>
            <p className="text-muted-foreground text-sm">
              Manage preferences associated with your account.
            </p>
          </div>
          <ItemGroup>
            <Item role="listitem" size="sm">
              <ItemContent>
                <ItemTitle>
                  <Label htmlFor="phone-number">Phone Number</Label>
                </ItemTitle>
                <ItemDescription>
                  Used for account and workspace communication.
                </ItemDescription>
              </ItemContent>
              <ItemActions className="w-64 shrink-0">
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="Add your phone number"
                  value={state.phone}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </ItemActions>
            </Item>
          </ItemGroup>
        </section>

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
                  value={state.baseCurrency}
                  onValueChange={(next: BaseCurrency) =>
                    baseCurrencyMutation.mutate({
                      next,
                      previous: state.baseCurrency,
                    })
                  }
                  disabled={
                    isLoading || !isOwner || baseCurrencyMutation.isPending
                  }
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
                      checked={state.featureFlags[setting.key]}
                      onCheckedChange={(checked) => {
                        const previous = state.featureFlags;
                        featureFlagsMutation.mutate({
                          previous,
                          next: { ...previous, [setting.key]: checked },
                        });
                      }}
                      disabled={
                        isLoading || !isOwner || featureFlagsMutation.isPending
                      }
                    />
                  </ItemActions>
                </Item>
              </div>
            ))}
          </ItemGroup>
        </section>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => phoneMutation.mutate()}
            disabled={isLoading || phoneMutation.isPending || !phoneIsDirty}
          >
            {phoneMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
