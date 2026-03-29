"use client";

import { format } from "date-fns";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import CategoryCombobox from "./category-combobox";
import { DescriptionInput } from "./description-input";
import LabelCombobox from "./label-combobox";
import TagMultiSelect from "./tag-multi-select";
import WalletPicker from "./wallet-picker";

import { EntityForm } from "@/components/shared/entity-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTags, useWallets } from "@/contexts/settings-context";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  updateRecurringTransaction,
} from "@/utils/supabase/mutations";
import { RecurringTransaction } from "@/utils/supabase/types";

interface RecurringTransactionFormProps {
  walletId?: string;
  recurring?: RecurringTransaction;
  type: "income" | "expense";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

type FormValues = {
  id?: string;
  wallet_id: string;
  category_id: string;
  label_id?: string;
  amount: number;
  description?: string;
  interval_type: string;
  start_date: string;
  end_date?: string;
  tags?: string[];
};

const RecurringTransactionForm = ({
  walletId,
  recurring,
  type,
  open,
  onOpenChange,
  onSuccess,
}: RecurringTransactionFormProps) => {
  const queryClient = useQueryClient();
  const [, walletMap] = useWallets();
  const [availableTags] = useTags();

  const defaultValues: FormValues = {
    id: recurring?.id,
    wallet_id: recurring?.wallet_id ?? walletId ?? "",
    category_id: recurring?.category_id ?? "",
    label_id: recurring?.label_id ?? undefined,
    amount: recurring ? recurring.amount_cents / 100 : 0,
    description: recurring?.description ?? "",
    interval_type: recurring?.interval_type ?? "monthly",
    start_date: recurring?.start_date ?? format(Date.now(), "yyyy-MM-dd"),
    end_date: recurring?.end_date ?? undefined,
    tags: recurring?.tags ?? [],
  };

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const selectedWallet = walletMap.get(values.wallet_id);
      if (!selectedWallet) {
        throw new Error("Selected wallet not found");
      }

      await createRecurringTransaction({
        wallet_id: values.wallet_id,
        category_id: values.category_id,
        label_id: values.label_id,
        amount_cents:
          Math.round(values.amount * 100) * (type === "expense" ? -1 : 1),
        currency: selectedWallet.currency,
        description: values.description,
        interval_type: values.interval_type,
        type,
        start_date: values.start_date,
        end_date: values.end_date,
        tags: values.tags,
      });
    },
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!recurring) throw new Error("missing id");

      const selectedWallet = walletMap.get(values.wallet_id);
      if (!selectedWallet) {
        throw new Error("Selected wallet not found");
      }

      await updateRecurringTransaction(recurring.id, {
        wallet_id: values.wallet_id,
        category_id: values.category_id,
        label_id: values.label_id,
        amount_cents: Math.round(values.amount * 100),
        currency: selectedWallet.currency,
        description: values.description,
        interval_type: values.interval_type,
        start_date: values.start_date,
        end_date: values.end_date,
        tags: values.tags,
      });
    },
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
      onSuccess?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!recurring) throw new Error("missing id");
      await deleteRecurringTransaction(recurring.id);
    },
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
      onSuccess?.();
    },
  });

  const handleSubmit = (values: FormValues) => {
    return new Promise<{ error?: string }>((resolve) => {
      if (recurring) {
        updateMutation.mutate(values, {
          onSuccess: () => resolve({}),
          onError: (error: unknown) =>
            resolve({
              error: error instanceof Error ? error.message : "Failed",
            }),
        });
      } else {
        createMutation.mutate(values, {
          onSuccess: () => resolve({}),
          onError: (error: unknown) =>
            resolve({
              error: error instanceof Error ? error.message : "Failed",
            }),
        });
      }
    });
  };

  const handleDelete = () => {
    return new Promise<{ error?: string }>((resolve) => {
      deleteMutation.mutate(undefined, {
        onSuccess: () => resolve({}),
        onError: (error: unknown) =>
          resolve({ error: error instanceof Error ? error.message : "Failed" }),
      });
    });
  };

  return (
    <EntityForm
      title="recurring transaction"
      entity={recurring ? defaultValues : undefined}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onDelete={recurring ? handleDelete : undefined}
      isLoading={
        createMutation.isPending ||
        updateMutation.isPending ||
        deleteMutation.isPending
      }
    >
      <FormField
        name="wallet_id"
        rules={{ required: "Wallet" }}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <WalletPicker {...field} className="w-full" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="amount"
        rules={{ required: "Amount is required" }}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <AmountInput {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <DescriptionInput {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="start_date"
        rules={{ required: "Start date is required" }}
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormControl>
              <DaterPicker {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="interval_type"
        rules={{ required: "Interval" }}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="category_id"
        rules={{ required: "Category" }}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <CategoryCombobox
                selectionType="combobox"
                type={type}
                value={field.value}
                onChange={field.onChange}
                placeholder="Category"
                className="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="label_id"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <LabelCombobox
                value={field.value || null}
                onChange={field.onChange}
                placeholder="Label"
                className="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="tags"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <TagMultiSelect
                {...field}
                options={availableTags}
                className="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </EntityForm>
  );
};

export default RecurringTransactionForm;
