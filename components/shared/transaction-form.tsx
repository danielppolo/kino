"use client";

import { useState } from "react";
import { format } from "date-fns";

import CreatableMultiSelect from "../ui/creatable-multi-select";
import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import { DescriptionInput } from "./description-input";
import LabelCombobox from "./label-combobox";

import { createTransaction } from "@/actions/create-transaction";
import CategoryCombobox from "@/components/shared/category-combobox";
import { EntityForm } from "@/components/shared/entity-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useWallets } from "@/contexts/settings-context";
import { deleteTransaction } from "@/utils/supabase/mutations";
import { Transaction } from "@/utils/supabase/types";

interface TransactionFormProps {
  walletId: string;
  date?: string;
  type: "income" | "expense" | "transfer";
  onSuccess?: () => void;
  initialData?: Transaction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type TransactionFormValues = {
  id?: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  date: string;
  description?: string;
  category_id: string;
  label_id: string;
  wallet_id: string;
  currency: string;
  tags?: string[];
};

const TransactionForm = ({
  walletId,
  date = format(Date.now(), "yyyy-MM-dd"),
  type,
  onSuccess,
  initialData,
  open,
  onOpenChange,
}: TransactionFormProps) => {
  const [, walletMap] = useWallets();
  const [addAnother, setAddAnother] = useState(false);

  const defaultValues: TransactionFormValues = {
    type: type,
    wallet_id: walletId,
    date: date,
    currency: walletMap.get(walletId)?.currency ?? "USD",
    description: "",
    category_id: "",
    label_id: "",
    amount: initialData ? Math.abs(initialData.amount_cents) / 100 : 0,
    tags: initialData?.tags ?? [],
  };

  const handleSubmit = async (values: TransactionFormValues) => {
    const { error } = await createTransaction(values, walletId);
    if (error) {
      return { error };
    }

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
    const { error } = await deleteTransaction(initialData.id);
    return { error: error?.message };
  };

  const convertToFormValues = (
    transaction: Transaction,
  ): TransactionFormValues => ({
    id: transaction.id,
    amount: Math.abs(transaction.amount_cents) / 100,
    type: transaction.type,
    date: transaction.date,
    description: transaction.description ?? undefined,
    category_id: transaction.category_id ?? "",
    label_id: transaction.label_id ?? "",
    wallet_id: transaction.wallet_id,
    currency: transaction.currency,
    tags: transaction.tags ?? undefined,
  });

  return (
    <EntityForm
      title="Transaction"
      entity={initialData ? convertToFormValues(initialData) : undefined}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      addAnother={addAnother}
      setAddAnother={setAddAnother}
    >
      <FormField
        name="amount"
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
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <CreatableMultiSelect {...field} className="w-full" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </EntityForm>
  );
};

export default TransactionForm;
