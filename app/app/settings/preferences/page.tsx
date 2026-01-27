"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { updateUserPreferences } from "@/utils/supabase/mutations";
import { FeatureFlags, parseFeatureFlags, DEFAULT_FEATURE_FLAGS } from "@/utils/types/feature-flags";

type PreferencesFormState = {
  userId: string | null;
  baseCurrency: "USD" | "MXN";
  phone: string;
  featureFlags: FeatureFlags;
};

export default function Page() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<PreferencesFormState>({
    userId: null,
    baseCurrency: "USD",
    phone: "",
    featureFlags: DEFAULT_FEATURE_FLAGS,
  });

  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("user_preferences")
        .select("user_id, base_currency, phone, feature_flags")
        .maybeSingle();

      if (error) throw new Error(error.message);

      return {
        userId: data?.user_id ?? user?.id ?? null,
        baseCurrency: (data?.base_currency ?? "USD") as "USD" | "MXN",
        phone: data?.phone ?? "",
        featureFlags: data?.feature_flags
          ? parseFeatureFlags(data.feature_flags)
          : DEFAULT_FEATURE_FLAGS,
      };
    },
  });

  useEffect(() => {
    if (!preferencesData) return;
    setFormState({
      userId: preferencesData.userId,
      baseCurrency: preferencesData.baseCurrency,
      phone: preferencesData.phone,
      featureFlags: preferencesData.featureFlags,
    });
  }, [preferencesData]);

  const updatePreferencesMutation = useMutation({
    mutationFn: async () => {
      if (!formState.userId) {
        throw new Error("User not found");
      }
      return updateUserPreferences({
        userId: formState.userId,
        baseCurrency: formState.baseCurrency,
        phone: formState.phone.trim() ? formState.phone.trim() : null,
        featureFlags: formState.featureFlags,
      });
    },
    onSuccess: () => {
      toast.success("Preferences updated successfully");
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      window.location.reload(); // Reload to apply feature flag changes
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update preferences");
      }
    },
  });

  const isDirty = !preferencesData ? false : (
    preferencesData.baseCurrency !== formState.baseCurrency ||
    (preferencesData.phone ?? "") !== formState.phone ||
    preferencesData.featureFlags.bills_enabled !== formState.featureFlags.bills_enabled
  );

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
          disabled={
            isLoading || updatePreferencesMutation.isPending || !isDirty
          }
        >
          Save
        </Button>
      </PageHeader>
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        <div className="max-w-xl space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Phone number
            </label>
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
            <label className="text-sm font-medium text-foreground">
              Base currency
            </label>
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

          {/* Feature Flags Section */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium">Features</h3>
            <p className="text-sm text-muted-foreground">
              Control which features are enabled in your workspace
            </p>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex-1">
                <Label htmlFor="bills-enabled" className="text-sm font-medium">
                  Bills Management
                </Label>
                <p className="text-sm text-muted-foreground">
                  Track and manage recurring and one-time bills
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
          </div>
        </div>
      </div>
    </div>
  );
}
