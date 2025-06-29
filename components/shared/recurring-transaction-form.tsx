"use client";

import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import { DescriptionInput } from "./description-input";
import CategoryCombobox from "./category-combobox";
import LabelCombobox from "./label-combobox";
import { EntityForm } from "@/components/shared/entity-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from "@/utils/supabase/mutations";
import { RecurringTransaction } from "@/utils/supabase/types";

interface RecurringTransactionFormProps {
  walletId: string;
  recurring?: RecurringTransaction;
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
  currency: string;
  description?: string;
  interval_type: string;
  start_date: string;
  end_date?: string;
};

const RecurringTransactionForm = ({
  walletId,
  recurring,
  open,
  onOpenChange,
  onSuccess,
}: RecurringTransactionFormProps) => {
  const queryClient = useQueryClient();
  const defaultValues: FormValues = {
    id: recurring?.id,
    wallet_id: walletId,
    category_id: recurring?.category_id ?? "",
    label_id: recurring?.label_id ?? undefined,
    amount: recurring ? recurring.amount_cents / 100 : (undefined as any),
    currency: recurring?.currency ?? "USD",
    description: recurring?.description ?? "",
    interval_type: recurring?.interval_type ?? "monthly",
    start_date: recurring?.start_date ?? format(Date.now(), "yyyy-MM-dd"),
    end_date: recurring?.end_date ?? undefined,
  };

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await createRecurringTransaction({
        wallet_id: walletId,
        category_id: values.category_id,
        label_id: values.label_id,
        amount_cents: Math.round(values.amount * 100),
        currency: values.currency,
        description: values.description,
        interval_type: values.interval_type,
        start_date: values.start_date,
        end_date: values.end_date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!recurring) throw new Error("missing id");
      await updateRecurringTransaction(recurring.id, {
        category_id: values.category_id,
        label_id: values.label_id,
        amount_cents: Math.round(values.amount * 100),
        currency: values.currency,
        description: values.description,
        interval_type: values.interval_type,
        start_date: values.start_date,
        end_date: values.end_date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      onSuccess?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!recurring) throw new Error("missing id");
      await deleteRecurringTransaction(recurring.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      onSuccess?.();
    },
  });

  const handleSubmit = (values: FormValues) => {
    return new Promise<{ error?: string }>((resolve) => {
      if (recurring) {
        updateMutation.mutate(values, {
          onSuccess: () => resolve({}),
          onError: (error: unknown) =>
            resolve({ error: error instanceof Error ? error.message : "Failed" }),
        });
      } else {
        createMutation.mutate(values, {
          onSuccess: () => resolve({}),
          onError: (error: unknown) =>
            resolve({ error: error instanceof Error ? error.message : "Failed" }),
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
      title="Recurring Transaction"
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
        name="amount"
        rules={{ required: "Amount is required" }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Amount</FormLabel>
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
            <FormLabel>Description</FormLabel>
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
            <FormLabel>Start Date</FormLabel>
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
            <FormLabel>Interval</FormLabel>
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
            <FormLabel>Category</FormLabel>
            <FormControl>
              <CategoryCombobox
                value={field.value}
                onChange={field.onChange}
                placeholder="Category"
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
            <FormLabel>Label</FormLabel>
            <FormControl>
              <LabelCombobox
                value={field.value || null}
                onChange={field.onChange}
                placeholder="Label"
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
