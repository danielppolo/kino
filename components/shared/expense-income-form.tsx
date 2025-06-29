"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import { DescriptionInput } from "./description-input";
import LabelCombobox from "./label-combobox";
import TagMultiSelect from "./tag-multi-select";
import TemplateCombobox from "./template-combobox";
import { useFormContext } from "react-hook-form";

import { createTransaction } from "@/actions/create-transaction";
import CategoryCombobox from "@/components/shared/category-combobox";
import { EntityForm } from "@/components/shared/entity-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useTags, useWallets, useTemplates } from "@/contexts/settings-context";
import useFilters from "@/hooks/use-filters";
import { deleteTransaction } from "@/utils/supabase/mutations";
import { Transaction, TransactionTemplate } from "@/utils/supabase/types";

interface TransactionPage {
  data: Transaction[];
  error: null;
  count: number;
}

interface InfiniteTransactionData {
  pages: TransactionPage[];
  pageParams: number[];
}

interface ExpenseIncomeFormProps {
  walletId: string;
  date?: string;
  type: "income" | "expense" | "transfer";
  onSuccess?: () => void;
  initialData?: Transaction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ExpenseIncomeFormValues = {
  id?: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  description?: string;
  category_id: string;
  label_id: string;
  wallet_id: string;
  currency: string;
  tags?: string[];
};

const ExpenseIncomeForm = ({
  walletId,
  date = format(Date.now(), "yyyy-MM-dd"),
  type,
  onSuccess,
  initialData,
  open,
  onOpenChange,
}: ExpenseIncomeFormProps) => {
  const [, walletMap] = useWallets();
  const filters = useFilters();
  const [availableTags] = useTags();
  const [addAnother, setAddAnother] = useState(false);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation<
    { data: Transaction[] },
    Error,
    ExpenseIncomeFormValues
  >({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", filters],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      // Remove the transaction from all transaction queries
      queryClient.setQueriesData<InfiniteTransactionData>(
        { queryKey: ["transactions"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((t) => t.id !== initialData?.id),
            })),
          };
        },
      );
    },
  });

  const defaultValues: ExpenseIncomeFormValues = {
    type,
    wallet_id: walletId,
    date: date,
    currency: walletMap.get(walletId)?.currency ?? "USD",
    description: "",
    category_id: "",
    label_id: "",
    amount: initialData ? Math.abs(initialData.amount_cents) / 100 : undefined,
    tags: initialData?.tag_ids ?? [],
  };

  const handleSubmit = async (values: ExpenseIncomeFormValues) => {
    await mutate(values);

    if (addAnother) {
      // Reset all fields except date
      const prevDate = values.date;
      return {
        error: undefined,
        resetValues: {
          ...defaultValues,
          date: prevDate,
        },
      };
    }

    return { error: undefined };
  };

  const handleDelete = async () => {
    if (!initialData?.id) return { error: "No transaction ID provided" };
    try {
      await deleteMutation.mutateAsync(initialData.id);
      return { error: undefined };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete transaction",
      };
    }
  };

  const convertToFormValues = (
    transaction: Transaction,
  ): ExpenseIncomeFormValues => ({
    id: transaction.id,
    amount: Math.abs(transaction.amount_cents) / 100,
    type: transaction.type,
    date: transaction.date,
    description: transaction.description ?? undefined,
    category_id: transaction.category_id ?? "",
    label_id: transaction.label_id ?? "",
    wallet_id: transaction.wallet_id,
    currency: transaction.currency,
    tags: transaction.tag_ids ?? undefined,
  });

  return (
    <EntityForm
      title={type}
      entity={initialData ? convertToFormValues(initialData) : undefined}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      addAnother={addAnother}
      setAddAnother={setAddAnother}
      isLoading={isPending || deleteMutation.isPending}
    >
      <FormField
        name="amount"
        defaultValue={null}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <AmountInput {...field} autoFocus />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="category_id"
          rules={{ required: "Category is required" }}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <CategoryCombobox {...field} type={type} className="w-full" />
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
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          name="date"
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
          name="label_id"
          rules={{ required: "Label is required" }}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <LabelCombobox {...field} className="w-full" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

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
};

export default ExpenseIncomeForm;
