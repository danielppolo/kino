"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { Database } from "@/utils/supabase/database.types";
import {
  createRealEstateAssetValuation,
  deleteRealEstateAssetValuation,
  updateRealEstateAssetValuation,
} from "@/utils/supabase/mutations";
import { RealEstateAssetValuation } from "@/utils/supabase/types";

interface RealEstateAssetValuationFormProps {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  valuation?: RealEstateAssetValuation | null;
}

type ValuationFormValues = {
  valuation_date: string;
  valuation_amount: string;
  valuation_method: string;
  notes: string;
};

function centsFromInput(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function RealEstateAssetValuationForm({
  assetId,
  open,
  onOpenChange,
  onSuccess,
  valuation,
}: RealEstateAssetValuationFormProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(valuation);

  const form = useForm<ValuationFormValues>({
    defaultValues: {
      valuation_date: valuation?.valuation_date ?? "",
      valuation_amount: valuation
        ? String(valuation.valuation_amount_cents / 100)
        : "",
      valuation_method: valuation?.valuation_method ?? "",
      notes: valuation?.notes ?? "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: ValuationFormValues) => {
      const payload = {
        asset_id: assetId,
        valuation_date: values.valuation_date,
        valuation_amount_cents: centsFromInput(values.valuation_amount),
        valuation_method: values.valuation_method.trim() || null,
        notes: values.notes.trim() || null,
      } satisfies Database["public"]["Tables"]["real_estate_asset_valuations"]["Insert"];

      if (valuation?.id) {
        return updateRealEstateAssetValuation({
          id: valuation.id,
          ...payload,
        });
      }

      return createRealEstateAssetValuation(payload);
    },
    onSuccess: async () => {
      toast.success(isEditing ? "Valuation updated" : "Valuation added");
      await invalidateWorkspaceQueries(queryClient);
      onSuccess();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to save valuation");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!valuation?.id) return;
      await deleteRealEstateAssetValuation(valuation.id);
    },
    onSuccess: async () => {
      toast.success("Valuation deleted");
      await invalidateWorkspaceQueries(queryClient);
      onSuccess();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete valuation",
      );
    },
  });

  return (
    <DrawerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit valuation" : "Add valuation"}
      description="Record a manual property valuation snapshot."
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="valuation_date"
            rules={{ required: "Valuation date is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valuation_amount"
            rules={{
              required: "Value is required",
              validate: (value) =>
                Number(value) >= 0 || "Value must be zero or greater",
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated value</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valuation_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Method</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Appraisal, market estimate, broker opinion..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Optional context for this valuation"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-2">
            {isEditing ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending || saveMutation.isPending}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <SubmitButton
              isLoading={saveMutation.isPending}
              className="min-w-32"
            >
              {isEditing ? "Update valuation" : "Add valuation"}
            </SubmitButton>
          </div>
        </form>
      </Form>
    </DrawerDialog>
  );
}
