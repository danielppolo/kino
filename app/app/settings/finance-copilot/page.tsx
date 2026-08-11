"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
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
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/contexts/workspace-context";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { createClient } from "@/utils/supabase/client";
import { updateWorkspaceFinanceMemory } from "@/utils/supabase/mutations";
import {
  createEmptyFinanceMemory,
  type FinanceMemory,
  type FinanceMemoryProfile,
  formatStringList,
  normalizeStringList,
  parseFinanceMemory,
} from "@/utils/types/finance-memory";

type TextFieldKey =
  | "country_of_residence"
  | "tax_region"
  | "preferred_language"
  | "base_planning_currency"
  | "preferred_explanation_style"
  | "fee_style_preference"
  | "dividend_vs_growth_preference"
  | "tax_sensitivity_preference"
  | "rebalancing_frequency";

type ListFieldKey =
  | "markets_accessible"
  | "brokerage_platforms"
  | "account_types"
  | "instruments_accessible"
  | "investment_goals"
  | "constraints"
  | "known_limitations";

type SelectFieldKey = "risk_tolerance" | "liquidity_needs" | "time_horizon";

const TEXT_FIELDS: Array<{
  key: TextFieldKey;
  label: string;
  placeholder?: string;
  uppercase?: boolean;
}> = [
  { key: "country_of_residence", label: "Country of residence" },
  { key: "tax_region", label: "Tax region" },
  { key: "preferred_language", label: "Preferred language" },
  {
    key: "base_planning_currency",
    label: "Base planning currency",
    placeholder: "USD, MXN, EUR…",
    uppercase: true,
  },
  {
    key: "preferred_explanation_style",
    label: "Preferred explanation style",
  },
  { key: "fee_style_preference", label: "Low-fee vs active preference" },
  {
    key: "dividend_vs_growth_preference",
    label: "Dividend vs growth preference",
  },
  {
    key: "tax_sensitivity_preference",
    label: "Tax sensitivity preference",
  },
  { key: "rebalancing_frequency", label: "Rebalancing frequency" },
];

const SELECT_FIELDS: Array<{
  key: SelectFieldKey;
  label: string;
  options: readonly string[];
}> = [
  {
    key: "risk_tolerance",
    label: "Risk tolerance",
    options: ["conservative", "moderate", "aggressive", "custom"],
  },
  {
    key: "liquidity_needs",
    label: "Liquidity needs",
    options: ["low", "medium", "high"],
  },
  {
    key: "time_horizon",
    label: "Time horizon",
    options: ["short_term", "medium_term", "long_term"],
  },
];

const LIST_FIELDS: Array<{
  key: ListFieldKey;
  label: string;
  placeholder: string;
}> = [
  {
    key: "markets_accessible",
    label: "Accessible markets",
    placeholder: "US\nMexico\nEU",
  },
  {
    key: "brokerage_platforms",
    label: "Brokerage platforms",
    placeholder: "Interactive Brokers\nGBM\nSchwab",
  },
  {
    key: "account_types",
    label: "Account types",
    placeholder: "Taxable\nRetirement\nCash-only",
  },
  {
    key: "instruments_accessible",
    label: "Accessible instruments",
    placeholder: "ETFs\nBonds\nMoney market funds",
  },
  {
    key: "investment_goals",
    label: "Investment goals",
    placeholder: "Capital preservation\nLong-term growth",
  },
  {
    key: "constraints",
    label: "Constraints",
    placeholder: "No leverage\nNo derivatives\nOnly local-currency assets",
  },
  {
    key: "known_limitations",
    label: "Known limitations",
    placeholder: "No access to US ETFs\nBroker does not support options",
  },
];

function setNullableText(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function updateProfileField<K extends keyof FinanceMemoryProfile>(
  memory: FinanceMemory,
  key: K,
  value: FinanceMemoryProfile[K],
) {
  return {
    ...memory,
    profile: { ...memory.profile, [key]: value },
  };
}

function normalizeFinanceMemory(memory: FinanceMemory): FinanceMemory {
  return {
    ...memory,
    profile: {
      ...memory.profile,
      country_of_residence: setNullableText(
        memory.profile.country_of_residence,
      ),
      tax_region: setNullableText(memory.profile.tax_region),
      preferred_language: setNullableText(memory.profile.preferred_language),
      base_planning_currency: setNullableText(
        memory.profile.base_planning_currency,
      ),
      risk_tolerance: setNullableText(memory.profile.risk_tolerance),
      liquidity_needs: setNullableText(memory.profile.liquidity_needs),
      time_horizon: setNullableText(memory.profile.time_horizon),
      preferred_explanation_style: setNullableText(
        memory.profile.preferred_explanation_style,
      ),
      rebalancing_frequency: setNullableText(
        memory.profile.rebalancing_frequency,
      ),
      dividend_vs_growth_preference: setNullableText(
        memory.profile.dividend_vs_growth_preference,
      ),
      tax_sensitivity_preference: setNullableText(
        memory.profile.tax_sensitivity_preference,
      ),
      fee_style_preference: setNullableText(
        memory.profile.fee_style_preference,
      ),
    },
    profile_updated_at: new Date().toISOString(),
    provenance: {
      profile: "user_declared",
      derived_context: "system_derived",
    },
  };
}

export default function FinanceCopilotSettingsPage() {
  const queryClient = useQueryClient();
  const { activeWorkspace, workspaceMembers } = useWorkspace();
  const [currentUserId, setCurrentUserId] = useState("");
  const [isPermissionLoading, setIsPermissionLoading] = useState(true);
  const sourceMemory = useMemo(
    () =>
      activeWorkspace?.finance_memory
        ? parseFinanceMemory(activeWorkspace.finance_memory)
        : createEmptyFinanceMemory(),
    [activeWorkspace?.finance_memory],
  );
  const [memory, setMemory] = useState<FinanceMemory>(sourceMemory);
  const [savedMemory, setSavedMemory] = useState<FinanceMemory>(sourceMemory);

  useEffect(() => {
    setMemory(sourceMemory);
    setSavedMemory(sourceMemory);
  }, [sourceMemory]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? "");
      } finally {
        setIsPermissionLoading(false);
      }
    };

    void loadCurrentUser();
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
  const isDirty = useMemo(
    () => JSON.stringify(memory) !== JSON.stringify(savedMemory),
    [memory, savedMemory],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeWorkspace) throw new Error("No active workspace");
      if (!isOwner) throw new Error("Only workspace owners can update memory");

      const nextMemory = normalizeFinanceMemory(memory);
      await updateWorkspaceFinanceMemory(activeWorkspace.id, nextMemory);
      return nextMemory;
    },
    onSuccess: (nextMemory) => {
      setMemory(nextMemory);
      setSavedMemory(nextMemory);
      toast.success("Finance Copilot memory updated");
      void invalidateWorkspaceQueries(queryClient);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update Finance Copilot memory",
      );
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
            Only workspace owners can modify Finance Copilot memory.
          </p>
        ) : null}

        <fieldset
          aria-labelledby="finance-copilot-profile"
          disabled={controlsDisabled}
          className="space-y-6"
        >
          <div>
            <h2
              id="finance-copilot-profile"
              className="text-base font-semibold"
            >
              Finance Copilot Profile
            </h2>
            <p className="text-muted-foreground text-sm">
              Localize investment and market guidance for this workspace.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {TEXT_FIELDS.slice(0, 4).map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  placeholder={field.placeholder}
                  value={memory.profile[field.key] ?? ""}
                  onChange={(event) =>
                    setMemory((current) =>
                      updateProfileField(
                        current,
                        field.key,
                        field.uppercase
                          ? event.target.value.toUpperCase()
                          : event.target.value,
                      ),
                    )
                  }
                />
              </div>
            ))}

            {SELECT_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Select
                  value={memory.profile[field.key] ?? "unset"}
                  onValueChange={(value) =>
                    setMemory((current) =>
                      updateProfileField(
                        current,
                        field.key,
                        value === "unset" ? null : value,
                      ),
                    )
                  }
                >
                  <SelectTrigger id={field.key}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    {field.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {TEXT_FIELDS.slice(4).map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={memory.profile[field.key] ?? ""}
                  onChange={(event) =>
                    setMemory((current) =>
                      updateProfileField(
                        current,
                        field.key,
                        event.target.value,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {LIST_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Textarea
                  id={field.key}
                  placeholder={field.placeholder}
                  value={formatStringList(memory.profile[field.key])}
                  onChange={(event) =>
                    setMemory((current) =>
                      updateProfileField(
                        current,
                        field.key,
                        normalizeStringList(event.target.value),
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </fieldset>

        <section aria-labelledby="derived-context" className="space-y-6">
          <div>
            <h2 id="derived-context" className="text-base font-semibold">
              Derived Context
            </h2>
            <p className="text-muted-foreground text-sm">
              Computed from structured finance data when the Copilot runs.
            </p>
          </div>

          <ItemGroup>
            <Item role="listitem" size="sm">
              <ItemContent>
                <ItemTitle>Currencies Held</ItemTitle>
                <ItemDescription>
                  {memory.derived_context.currencies_held.join(", ") ||
                    "None derived yet"}
                </ItemDescription>
              </ItemContent>
            </Item>
            <ItemSeparator />
            <Item role="listitem" size="sm">
              <ItemContent>
                <ItemTitle>Wallet Types</ItemTitle>
                <ItemDescription>
                  {memory.derived_context.wallet_types.join(", ") ||
                    "None derived yet"}
                </ItemDescription>
              </ItemContent>
            </Item>
            <ItemSeparator />
            <Item role="listitem" size="sm">
              <ItemContent>
                <ItemTitle>Asset Exposure Summary</ItemTitle>
                <div className="text-muted-foreground space-y-2 text-sm">
                  {memory.derived_context.observed_asset_exposure_summary
                    .length ? (
                    memory.derived_context.observed_asset_exposure_summary.map(
                      (item) => (
                        <div key={`${item.label}-${item.detail}`}>
                          <p className="text-foreground font-medium">
                            {item.label}
                          </p>
                          <p>{item.detail}</p>
                        </div>
                      ),
                    )
                  ) : (
                    <p>None derived yet</p>
                  )}
                </div>
              </ItemContent>
            </Item>
            <ItemSeparator />
            <Item role="listitem" size="sm">
              <ItemContent>
                <ItemTitle>Liquidity and Stability Signals</ItemTitle>
                <div className="text-muted-foreground space-y-2 text-sm">
                  {[
                    ...memory.derived_context.income_stability_signals,
                    ...memory.derived_context.liquidity_pressure_signals,
                    ...memory.derived_context.recent_behavioral_notes,
                  ].length ? (
                    [
                      ...memory.derived_context.income_stability_signals,
                      ...memory.derived_context.liquidity_pressure_signals,
                      ...memory.derived_context.recent_behavioral_notes,
                    ].map((item) => <p key={item}>{item}</p>)
                  ) : (
                    <p>None derived yet</p>
                  )}
                </div>
              </ItemContent>
            </Item>
          </ItemGroup>

          <p className="text-muted-foreground text-xs">
            Profile updated at: {memory.profile_updated_at ?? "Never"}. Derived
            updated at: {memory.derived_updated_at ?? "Not yet derived"}.
          </p>
        </section>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={controlsDisabled || saveMutation.isPending || !isDirty}
          >
            {saveMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
