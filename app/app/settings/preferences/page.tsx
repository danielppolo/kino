"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useWorkspace } from "@/contexts/workspace-context";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";
import {
  updateUserPreferences,
  updateWorkspaceBaseCurrency,
  updateWorkspaceFeatureFlags,
  updateWorkspaceFinanceMemory,
} from "@/utils/supabase/mutations";
import {
  createEmptyFinanceMemory,
  formatStringList,
  parseFinanceMemory,
  type FinanceMemory,
  type FinanceMemoryProfile,
  normalizeStringList,
} from "@/utils/types/finance-memory";
import {
  DEFAULT_FEATURE_FLAGS,
  FeatureFlags,
  parseFeatureFlags,
} from "@/utils/types/feature-flags";

const RISK_TOLERANCE_OPTIONS = [
  "conservative",
  "moderate",
  "aggressive",
  "custom",
] as const;
const LIQUIDITY_NEEDS_OPTIONS = ["low", "medium", "high"] as const;
const TIME_HORIZON_OPTIONS = [
  "short_term",
  "medium_term",
  "long_term",
] as const;

type PreferencesFormState = {
  userId: string | null;
  baseCurrency: "USD" | "MXN";
  phone: string;
  featureFlags: FeatureFlags;
  financeMemory: FinanceMemory;
};

function setNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function updateProfileField(
  financeMemory: FinanceMemory,
  field: keyof FinanceMemoryProfile,
  value: string | string[] | null,
) {
  return {
    ...financeMemory,
    profile: {
      ...financeMemory.profile,
      [field]: value,
    },
  };
}

export default function Page() {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const [formState, setFormState] = useState<PreferencesFormState>({
    userId: null,
    baseCurrency: "USD",
    phone: "",
    featureFlags: DEFAULT_FEATURE_FLAGS,
    financeMemory: createEmptyFinanceMemory(),
  });

  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ["user-preferences", activeWorkspace?.id],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: userPrefs, error: prefsError } = await supabase
        .from("user_preferences")
        .select("user_id, phone")
        .maybeSingle();

      if (prefsError) throw new Error(prefsError.message);

      const baseCurrency = (activeWorkspace?.base_currency ?? "USD") as
        | "USD"
        | "MXN";
      const featureFlags = activeWorkspace?.feature_flags
        ? parseFeatureFlags(activeWorkspace.feature_flags)
        : DEFAULT_FEATURE_FLAGS;

      return {
        userId: userPrefs?.user_id ?? user?.id ?? null,
        baseCurrency,
        phone: userPrefs?.phone ?? "",
        featureFlags,
        financeMemory: activeWorkspace?.finance_memory
          ? parseFinanceMemory(activeWorkspace.finance_memory)
          : createEmptyFinanceMemory(),
      };
    },
    enabled: !!activeWorkspace,
  });

  useEffect(() => {
    if (!preferencesData) return;
    setFormState({
      userId: preferencesData.userId,
      baseCurrency: preferencesData.baseCurrency,
      phone: preferencesData.phone,
      featureFlags: preferencesData.featureFlags,
      financeMemory: preferencesData.financeMemory,
    });
  }, [preferencesData]);

  const updatePreferencesMutation = useMutation({
    mutationFn: async () => {
      if (!formState.userId) {
        throw new Error("User not found");
      }
      if (!activeWorkspace) {
        throw new Error("No active workspace");
      }

      const financeMemoryToSave: FinanceMemory = {
        ...formState.financeMemory,
        profile: {
          ...formState.financeMemory.profile,
          country_of_residence: setNullableText(
            formState.financeMemory.profile.country_of_residence ?? "",
          ),
          tax_region: setNullableText(
            formState.financeMemory.profile.tax_region ?? "",
          ),
          preferred_language: setNullableText(
            formState.financeMemory.profile.preferred_language ?? "",
          ),
          base_planning_currency: setNullableText(
            formState.financeMemory.profile.base_planning_currency ?? "",
          ),
          risk_tolerance: setNullableText(
            formState.financeMemory.profile.risk_tolerance ?? "",
          ),
          liquidity_needs: setNullableText(
            formState.financeMemory.profile.liquidity_needs ?? "",
          ),
          time_horizon: setNullableText(
            formState.financeMemory.profile.time_horizon ?? "",
          ),
          preferred_explanation_style: setNullableText(
            formState.financeMemory.profile.preferred_explanation_style ?? "",
          ),
          rebalancing_frequency: setNullableText(
            formState.financeMemory.profile.rebalancing_frequency ?? "",
          ),
          dividend_vs_growth_preference: setNullableText(
            formState.financeMemory.profile.dividend_vs_growth_preference ?? "",
          ),
          tax_sensitivity_preference: setNullableText(
            formState.financeMemory.profile.tax_sensitivity_preference ?? "",
          ),
          fee_style_preference: setNullableText(
            formState.financeMemory.profile.fee_style_preference ?? "",
          ),
        },
        profile_updated_at: new Date().toISOString(),
        provenance: {
          profile: "user_declared",
          derived_context: "system_derived",
        },
      };

      await updateUserPreferences({
        userId: formState.userId,
        phone: formState.phone.trim() ? formState.phone.trim() : null,
      });

      await updateWorkspaceBaseCurrency(
        activeWorkspace.id,
        formState.baseCurrency,
      );

      await updateWorkspaceFeatureFlags(
        activeWorkspace.id,
        formState.featureFlags,
      );

      await updateWorkspaceFinanceMemory(
        activeWorkspace.id,
        financeMemoryToSave,
      );
    },
    onSuccess: () => {
      toast.success("Preferences updated successfully");
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      window.location.reload();
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update preferences");
      }
    },
  });

  const isDirty = useMemo(() => {
    if (!preferencesData) return false;

    return (
      preferencesData.baseCurrency !== formState.baseCurrency ||
      (preferencesData.phone ?? "") !== formState.phone ||
      preferencesData.featureFlags.bills_enabled !==
        formState.featureFlags.bills_enabled ||
      preferencesData.featureFlags.infographics_autonomy_enabled !==
        formState.featureFlags.infographics_autonomy_enabled ||
      JSON.stringify(preferencesData.financeMemory) !==
        JSON.stringify(formState.financeMemory)
    );
  }, [formState, preferencesData]);

  const handleSave = () => {
    updatePreferencesMutation.mutate();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Preferences</h2>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isLoading || updatePreferencesMutation.isPending || !isDirty}
        >
          Save
        </Button>
      </PageHeader>

      <div className="flex-1 space-y-8 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium">General</h3>

            <div className="space-y-2">
              <Label>Phone number</Label>
              <Input
                type="tel"
                placeholder="Add your phone number"
                value={formState.phone}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Base currency</Label>
              <Select
                value={formState.baseCurrency}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    baseCurrency: value as "USD" | "MXN",
                  }))
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium">Features</h3>
            <p className="text-sm text-muted-foreground">
              Control which features are enabled in your workspace.
            </p>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="bills-enabled">Bills Management</Label>
                <p className="text-sm text-muted-foreground">
                  Track and manage recurring and one-time bills.
                </p>
              </div>
              <Switch
                id="bills-enabled"
                checked={formState.featureFlags.bills_enabled}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({
                    ...prev,
                    featureFlags: {
                      ...prev.featureFlags,
                      bills_enabled: checked,
                    },
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="autonomy-enabled">Autonomy Framework</Label>
                <p className="text-sm text-muted-foreground">
                  Show autonomy and financial independence charts in infographics.
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
              />
            </div>
          </div>

          <div className="space-y-6 border-t pt-6">
            <div>
              <h3 className="text-lg font-medium">Finance Copilot Memory</h3>
              <p className="text-sm text-muted-foreground">
                This workspace profile helps the copilot localize investment and
                market suggestions. It is advisory context, not guaranteed live
                market availability.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Country of residence</Label>
                <Input
                  value={formState.financeMemory.profile.country_of_residence ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "country_of_residence",
                        event.target.value,
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tax region</Label>
                <Input
                  value={formState.financeMemory.profile.tax_region ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "tax_region",
                        event.target.value,
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred language</Label>
                <Input
                  value={formState.financeMemory.profile.preferred_language ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "preferred_language",
                        event.target.value,
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Base planning currency</Label>
                <Input
                  placeholder="USD, MXN, EUR..."
                  value={
                    formState.financeMemory.profile.base_planning_currency ?? ""
                  }
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "base_planning_currency",
                        event.target.value.toUpperCase(),
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Risk tolerance</Label>
                <Select
                  value={formState.financeMemory.profile.risk_tolerance ?? "unset"}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "risk_tolerance",
                        value === "unset" ? null : value,
                      ),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    {RISK_TOLERANCE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Liquidity needs</Label>
                <Select
                  value={formState.financeMemory.profile.liquidity_needs ?? "unset"}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "liquidity_needs",
                        value === "unset" ? null : value,
                      ),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    {LIQUIDITY_NEEDS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time horizon</Label>
                <Select
                  value={formState.financeMemory.profile.time_horizon ?? "unset"}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "time_horizon",
                        value === "unset" ? null : value,
                      ),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    {TIME_HORIZON_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Preferred explanation style</Label>
                <Input
                  value={
                    formState.financeMemory.profile.preferred_explanation_style ??
                    ""
                  }
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "preferred_explanation_style",
                        event.target.value,
                      ),
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Accessible markets</Label>
                <Textarea
                  placeholder="US&#10;Mexico&#10;EU"
                  value={formatStringList(
                    formState.financeMemory.profile.markets_accessible,
                  )}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "markets_accessible",
                        normalizeStringList(event.target.value),
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Brokerage platforms</Label>
                <Textarea
                  placeholder="Interactive Brokers&#10;GBM&#10;Schwab"
                  value={formatStringList(
                    formState.financeMemory.profile.brokerage_platforms,
                  )}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "brokerage_platforms",
                        normalizeStringList(event.target.value),
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Account types</Label>
                <Textarea
                  placeholder="Taxable&#10;Retirement&#10;Cash-only"
                  value={formatStringList(
                    formState.financeMemory.profile.account_types,
                  )}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "account_types",
                        normalizeStringList(event.target.value),
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Accessible instruments</Label>
                <Textarea
                  placeholder="ETFs&#10;Bonds&#10;Money market funds"
                  value={formatStringList(
                    formState.financeMemory.profile.instruments_accessible,
                  )}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "instruments_accessible",
                        normalizeStringList(event.target.value),
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Investment goals</Label>
                <Textarea
                  placeholder="Capital preservation&#10;Long-term growth"
                  value={formatStringList(
                    formState.financeMemory.profile.investment_goals,
                  )}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "investment_goals",
                        normalizeStringList(event.target.value),
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Constraints</Label>
                <Textarea
                  placeholder="No leverage&#10;No derivatives&#10;Only local-currency assets"
                  value={formatStringList(
                    formState.financeMemory.profile.constraints,
                  )}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "constraints",
                        normalizeStringList(event.target.value),
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Known limitations</Label>
                <Textarea
                  placeholder="No access to US ETFs&#10;Broker does not support options"
                  value={formatStringList(
                    formState.financeMemory.profile.known_limitations,
                  )}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "known_limitations",
                        normalizeStringList(event.target.value),
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Low-fee vs active preference</Label>
                <Input
                  value={formState.financeMemory.profile.fee_style_preference ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "fee_style_preference",
                        event.target.value,
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Dividend vs growth preference</Label>
                <Input
                  value={
                    formState.financeMemory.profile
                      .dividend_vs_growth_preference ?? ""
                  }
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "dividend_vs_growth_preference",
                        event.target.value,
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tax sensitivity preference</Label>
                <Input
                  value={
                    formState.financeMemory.profile.tax_sensitivity_preference ??
                    ""
                  }
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "tax_sensitivity_preference",
                        event.target.value,
                      ),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Rebalancing frequency</Label>
                <Input
                  value={
                    formState.financeMemory.profile.rebalancing_frequency ?? ""
                  }
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      financeMemory: updateProfileField(
                        prev.financeMemory,
                        "rebalancing_frequency",
                        event.target.value,
                      ),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-6 border-t pt-6">
            <div>
              <h3 className="text-lg font-medium">Derived Context</h3>
              <p className="text-sm text-muted-foreground">
                This section is computed from structured finance data and may
                update when the copilot runs.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Currencies held
                </p>
                <p className="mt-2 text-sm">
                  {formState.financeMemory.derived_context.currencies_held.join(", ") ||
                    "None derived yet"}
                </p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Wallet types
                </p>
                <p className="mt-2 text-sm">
                  {formState.financeMemory.derived_context.wallet_types.join(", ") ||
                    "None derived yet"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Asset exposure summary
                </p>
                <div className="mt-2 space-y-2 text-sm">
                  {formState.financeMemory.derived_context
                    .observed_asset_exposure_summary.length ? (
                    formState.financeMemory.derived_context.observed_asset_exposure_summary.map(
                      (item) => (
                        <div key={`${item.label}-${item.detail}`}>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-muted-foreground">{item.detail}</p>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-muted-foreground">None derived yet</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Liquidity and stability signals
                </p>
                <div className="mt-2 space-y-2 text-sm">
                  {[
                    ...formState.financeMemory.derived_context
                      .income_stability_signals,
                    ...formState.financeMemory.derived_context
                      .liquidity_pressure_signals,
                    ...formState.financeMemory.derived_context
                      .recent_behavioral_notes,
                  ].length ? (
                    [
                      ...formState.financeMemory.derived_context
                        .income_stability_signals,
                      ...formState.financeMemory.derived_context
                        .liquidity_pressure_signals,
                      ...formState.financeMemory.derived_context
                        .recent_behavioral_notes,
                    ].map((item) => (
                      <p key={item} className="text-muted-foreground">
                        {item}
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">None derived yet</p>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Profile updated at:{" "}
              {formState.financeMemory.profile_updated_at ?? "Never"}.
              Derived updated at:{" "}
              {formState.financeMemory.derived_updated_at ?? "Not yet derived"}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
