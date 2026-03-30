"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { RealEstateAssetValuationForm } from "@/components/shared/real-estate-asset-valuation-form";
import TransactionMultiSelect from "@/components/shared/transaction-multi-select";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@/components/ui/typography";
import { useRealEstateAssets, useWallets } from "@/contexts/settings-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/utils/supabase/database.types";
import {
  createRealEstateAsset,
  deleteRealEstateAsset,
  updateRealEstateAsset,
} from "@/utils/supabase/mutations";
import {
  listRealEstateAssetValuations,
  listTransactions,
} from "@/utils/supabase/queries";
import {
  RealEstateAsset,
  RealEstateAssetValuation,
  TransactionList,
} from "@/utils/supabase/types";

const ASSET_TYPE_OPTIONS: Array<{
  value: Database["public"]["Enums"]["real_estate_asset_type"];
  label: string;
}> = [
  { value: "primary_home", label: "Primary home" },
  { value: "rental_property", label: "Rental property" },
  { value: "land", label: "Land" },
  { value: "commercial_property", label: "Commercial property" },
  { value: "other_real_estate", label: "Other real estate" },
];

const STATUS_OPTIONS: Array<{
  value: Database["public"]["Enums"]["real_estate_asset_status"];
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
];

interface RealEstateAssetFormProps {
  asset?: RealEstateAsset;
  onSuccess: () => void;
}

type AssetFormValues = {
  name: string;
  currency: string;
  asset_type: Database["public"]["Enums"]["real_estate_asset_type"];
  status: Database["public"]["Enums"]["real_estate_asset_status"];
  acquired_on: string;
  origin_transaction_ids: string[];
  notes: string;
};

export function RealEstateAssetForm({
  asset,
  onSuccess,
}: RealEstateAssetFormProps) {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const [wallets] = useWallets();
  const [assets] = useRealEstateAssets();
  const [valuationDialogOpen, setValuationDialogOpen] = useState(false);
  const [selectedValuation, setSelectedValuation] =
    useState<RealEstateAssetValuation | null>(null);
  const isEditing = Boolean(asset);

  const form = useForm<AssetFormValues>({
    defaultValues: {
      name: asset?.name ?? "",
      currency: asset?.currency ?? activeWorkspace?.base_currency ?? "USD",
      asset_type: asset?.asset_type ?? "other_real_estate",
      status: asset?.status ?? "active",
      acquired_on: asset?.acquired_on ?? "",
      origin_transaction_ids: asset?.origin_transaction_id
        ? [asset.origin_transaction_id]
        : [],
      notes: asset?.notes ?? "",
    },
  });

  const { data: recentTransactions = [] } = useQuery<TransactionList[]>({
    queryKey: ["real-estate-asset-origin-transactions", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];
      const supabase = await createClient();
      const result = await listTransactions(supabase, {
        workspaceWalletIds: wallets.map((wallet) => wallet.id),
        pageSize: 100,
        page: 0,
      });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    enabled: Boolean(activeWorkspace?.id && wallets.length > 0),
  });

  const { data: valuations = [] } = useQuery<RealEstateAssetValuation[]>({
    queryKey: ["real-estate-asset-valuations", asset?.id],
    queryFn: async () => {
      if (!asset?.id) return [];
      const supabase = await createClient();
      const result = await listRealEstateAssetValuations(supabase, {
        assetId: asset.id,
      });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    enabled: Boolean(asset?.id),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: AssetFormValues) => {
      const payload = {
        workspace_id: activeWorkspace?.id ?? "",
        name: values.name.trim(),
        currency: values.currency,
        asset_type: values.asset_type,
        status: values.status,
        acquired_on: values.acquired_on || null,
        origin_transaction_id: values.origin_transaction_ids[0] ?? null,
        notes: values.notes.trim() || null,
        metadata: {},
      } satisfies Database["public"]["Tables"]["real_estate_assets"]["Insert"];

      if (!activeWorkspace?.id) {
        throw new Error("No active workspace selected");
      }

      if (asset?.id) {
        return updateRealEstateAsset({
          id: asset.id,
          ...payload,
        });
      }

      return createRealEstateAsset(payload);
    },
    onSuccess: async () => {
      toast.success(isEditing ? "Asset updated" : "Asset created");
      await invalidateWorkspaceQueries(queryClient);
      onSuccess();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to save asset");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!asset?.id) return;
      await deleteRealEstateAsset(asset.id);
    },
    onSuccess: async () => {
      toast.success("Asset deleted");
      await invalidateWorkspaceQueries(queryClient);
      onSuccess();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete asset");
    },
  });

  const latestValuation = valuations[0] ?? null;
  const assetCountCopy = useMemo(
    () => `${assets.length} asset${assets.length === 1 ? "" : "s"} in workspace`,
    [assets.length],
  );

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <Text muted className="text-xs">
              {assetCountCopy}
            </Text>
            {latestValuation ? (
              <Text muted className="text-xs">
                Latest valuation {format(new Date(`${latestValuation.valuation_date}T00:00:00`), "PP")}
              </Text>
            ) : null}
          </div>

          <FormField
            control={form.control}
            name="name"
            rules={{ required: "Name is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Casa Condesa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="currency"
              rules={{ required: "Currency is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="USD" maxLength={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acquired_on"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acquired on</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="asset_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ASSET_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="origin_transaction_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked purchase transaction</FormLabel>
                <FormControl>
                  <TransactionMultiSelect
                    value={field.value}
                    onChange={(values) => field.onChange(values.slice(-1))}
                    transactions={recentTransactions}
                    placeholder="Optional: link one purchase transaction"
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
                    placeholder="Usage, location, scenario notes, tenant context..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {asset?.id ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-sm font-medium">Valuation history</Text>
                  <Text muted className="text-xs">
                    Manual snapshots used by reporting and AI context.
                  </Text>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedValuation(null);
                    setValuationDialogOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              {valuations.length > 0 ? (
                <div className="space-y-2">
                  {valuations.map((valuation) => (
                    <button
                      key={valuation.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-accent"
                      onClick={() => {
                        setSelectedValuation(valuation);
                        setValuationDialogOpen(true);
                      }}
                    >
                      <div>
                        <Text className="text-sm">
                          {format(
                            new Date(`${valuation.valuation_date}T00:00:00`),
                            "PP",
                          )}
                        </Text>
                        <Text muted className="text-xs">
                          {valuation.valuation_method || "Manual estimate"}
                        </Text>
                      </div>
                      <Text className="text-sm font-medium">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: asset.currency,
                        }).format(valuation.valuation_amount_cents / 100)}
                      </Text>
                    </button>
                  ))}
                </div>
              ) : (
                <Text muted className="text-sm">
                  No valuations yet.
                </Text>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-3">
              <Text muted className="text-sm">
                Save the asset first, then add valuation history.
              </Text>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {asset ? (
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

            <SubmitButton isLoading={saveMutation.isPending} className="min-w-32">
              {asset ? "Update asset" : "Create asset"}
            </SubmitButton>
          </div>
        </form>
      </Form>

      {asset?.id ? (
        <RealEstateAssetValuationForm
          assetId={asset.id}
          open={valuationDialogOpen}
          onOpenChange={setValuationDialogOpen}
          valuation={selectedValuation}
          onSuccess={() => {
            setValuationDialogOpen(false);
            setSelectedValuation(null);
            void invalidateWorkspaceQueries(queryClient);
          }}
        />
      ) : null}
    </>
  );
}
