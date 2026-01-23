"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { updateUserPreferences } from "@/utils/supabase/mutations";

type PreferencesFormState = {
  userId: string | null;
  baseCurrency: "USD" | "MXN";
  phone: string;
};

export default function Page() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<PreferencesFormState>({
    userId: null,
    baseCurrency: "USD",
    phone: "",
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
        .select("user_id, base_currency, phone")
        .maybeSingle();

      if (error) throw new Error(error.message);

      return {
        userId: data?.user_id ?? user?.id ?? null,
        baseCurrency: (data?.base_currency ?? "USD") as "USD" | "MXN",
        phone: data?.phone ?? "",
      };
    },
  });

  useEffect(() => {
    if (!preferencesData) return;
    setFormState({
      userId: preferencesData.userId,
      baseCurrency: preferencesData.baseCurrency,
      phone: preferencesData.phone,
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
      });
    },
    onSuccess: () => {
      toast.success("Preferences updated successfully");
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
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
      (preferencesData.phone ?? "") !== formState.phone
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
        </div>
      </div>
    </div>
  );
}
