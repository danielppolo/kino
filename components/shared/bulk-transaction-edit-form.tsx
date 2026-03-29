"use client";

import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateTransactions } from "@/actions/update-transactions";
import CategoryCombobox from "@/components/shared/category-combobox";
import { EntityForm } from "@/components/shared/entity-form";
import LabelCombobox from "@/components/shared/label-combobox";
import TagMultiSelect from "@/components/shared/tag-multi-select";
import DatePicker from "@/components/ui/date-picker";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useTags } from "@/contexts/settings-context";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { TransactionList } from "@/utils/supabase/types";

interface BulkTransactionEditFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionIds: string[];
  selectedTransactions: TransactionList[];
  onSuccess?: () => void;
}

type FormValues = {
  category_id: string;
  label_id: string;
  date: string;
  tags: string[];
};

export default function BulkTransactionEditForm({
  open,
  onOpenChange,
  transactionIds,
  selectedTransactions,
  onSuccess,
}: BulkTransactionEditFormProps) {
  const queryClient = useQueryClient();
  const [availableTags] = useTags();

  // Check if all selected transactions have the same type
  const commonType =
    selectedTransactions.length > 0
      ? selectedTransactions.every(
          (t) => t.type === selectedTransactions[0].type,
        )
        ? selectedTransactions[0].type
        : null
      : null;

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const result = await updateTransactions(transactionIds, {
        category_id: values.category_id || undefined,
        label_id: values.label_id || undefined,
        date: values.date || undefined,
        tags: values.tags.length ? values.tags : undefined,
      });
      if (result.error) throw new Error(result.error);

      return result;
    },
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
      toast.success("Transactions updated");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isLoading = mutation.isPending;

  const defaultValues: FormValues = {
    category_id: "",
    label_id: "",
    date: "",
    tags: [],
  };

  return (
    <EntityForm
      title="transactions"
      open={open}
      onOpenChange={onOpenChange}
      defaultValues={defaultValues}
      customTitle="Edit transactions"
      submitLabel="Update"
      onSubmit={async (values) => {
        await mutation.mutateAsync(values);
        return { error: undefined };
      }}
      isLoading={isLoading}
    >
      {commonType && (
        <FormField
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <CategoryCombobox
                  {...field}
                  selectionType="combobox"
                  type={commonType}
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        name="label_id"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <LabelCombobox {...field} className="w-full" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <DatePicker {...field} className="w-full" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="tags"
        render={({ field: { onChange, ...field } }) => (
          <FormItem>
            <FormControl>
              <TagMultiSelect
                {...field}
                onChange={onChange}
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
}
