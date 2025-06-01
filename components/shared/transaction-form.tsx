"use client";

import { useTransition } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";

import { SubmitButton } from "../submit-button";
import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import { DescriptionInput } from "./description-input";
import LabelCombobox from "./label-combobox";

import { createTransaction } from "@/actions/create-transaction";
import CategoryCombobox from "@/components/shared/category-combobox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useWallets } from "@/contexts/settings-context";
import { Transaction } from "@/utils/supabase/types";

interface TransactionFormProps {
  walletId: string;
  date?: string;
  type: "income" | "expense" | "transfer";
  onSuccess?: () => void;
  initialData?: Transaction;
}

const formSchema = z.object({
  amount: z
    .string()
    .refine((val) => /^-?\d*(\.\d+)?$/.test(val), {
      message: "Amount must be a valid number",
    })
    .transform((val) => Number(val)),
  type: z.enum(["expense", "income", "transfer"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
  category_id: z.string().uuid(),
  label_id: z.string().uuid(),
  wallet_id: z.string().uuid(),
  currency: z.string(),
});

type TransactionFormValues = z.infer<typeof formSchema>;

const TransactionForm = ({
  walletId,
  date = format(Date.now(), "yyyy-MM-dd"),
  type,
  onSuccess,
  initialData,
}: TransactionFormProps) => {
  const [, walletMap] = useWallets();
  const [, startTransition] = useTransition();
  const [addAnother, setAddAnother] = useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: initialData?.type ?? type,
      wallet_id: initialData?.wallet_id ?? walletId,
      date: initialData?.date ?? date,
      currency: initialData?.currency ?? walletMap.get(walletId)?.currency,
      description: initialData?.description ?? undefined,
      category_id: initialData?.category_id ?? undefined,
      label_id: initialData?.label_id ?? undefined,
      amount: initialData ? String(initialData.amount_cents / 100) : undefined,
    },
  });

  const onSubmit = async (values: TransactionFormValues) => {
    startTransition(() => {
      (async () => {
        const { error } = await createTransaction(values);

        if (error) {
          toast.error(error);
          return;
        }

        toast.success("Transaction added successfully!");
        if (addAnother) {
          // Reset all fields except date
          const prevDate = values.date;
          form.reset({
            type,
            wallet_id: walletId,
            date: prevDate,
            currency: walletMap.get(walletId)?.currency,
            description: undefined,
            category_id: undefined,
            label_id: undefined,
          });
        } else {
          onSuccess?.();
        }
      })();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
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
          control={form.control}
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
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <FormControl>
                <DaterPicker {...field} />
              </FormControl>
              <FormDescription>
                This date is required for the transaction.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category_id"
          rules={{ required: "Category is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <CategoryCombobox {...field} type={type} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="label_id"
          rules={{ required: "Label is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <LabelCombobox {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="add-another"
              checked={addAnother}
              onCheckedChange={setAddAnother}
            />
            <label htmlFor="add-another" className="text-sm">
              Create more
            </label>
          </div>
          <SubmitButton size="sm">Create transaction</SubmitButton>
        </div>
      </form>
    </Form>
  );
};

export default TransactionForm;
