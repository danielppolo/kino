"use client";

import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { toast } from "sonner";

import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import { DescriptionInput } from "./description-input";
import LabelPicker from "./label-picker";

import { createTransaction } from "@/actions/create-transaction";
import CategoryPicker from "@/components/shared/category-picker";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useWallets } from "@/contexts/settings-context";
import { Database } from "@/utils/supabase/database.types";

interface TransactionFormProps {
  walletId: string;
  date?: string;
  type: "income" | "expense" | "transfer";
  onSuccess: () => void;
}

type TransactionFormValues = Omit<
  Database["public"]["Tables"]["transactions"]["Insert"],
  "amount_cents"
> & {
  amount: number;
};

const TransactionForm = ({
  walletId,
  date = format(Date.now(), "yyyy-MM-dd"),
  type,
  onSuccess,
}: TransactionFormProps) => {
  const [, walletDict] = useWallets();
  const form = useForm<TransactionFormValues>({
    defaultValues: {
      type,
      wallet_id: walletId,
      date,
      currency: walletDict[walletId]?.currency,
    },
  });

  const onSubmit = async (transaction: TransactionFormValues) => {
    const { error } = await createTransaction(transaction);

    if (error) {
      return toast.error(error.message);
    }
    toast.success("Transaction added successfully!");
    onSuccess();
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
                <CategoryPicker {...field} type={type} />
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
                <LabelPicker {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Add Transaction</Button>
      </form>
    </Form>
  );
};

export default TransactionForm;
