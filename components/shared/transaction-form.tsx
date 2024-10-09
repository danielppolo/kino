"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useInsertMutation } from "@supabase-cache-helpers/postgrest-react-query";

import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import { DescriptionInput } from "./description-input";
import LabelPicker from "./label-picker";
import WalletPicker from "./wallet-picker";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/utils/supabase/database.types";

const supabase = createClient();

interface TransactionFormProps {
  type: "income" | "expense" | "transfer";
  onSuccess: () => void;
}

type TransactionFormValues =
  Database["public"]["Tables"]["transactions"]["Insert"];

const TransactionForm = ({ type, onSuccess }: TransactionFormProps) => {
  const { mutateAsync: insert } = useInsertMutation(
    supabase.from("transactions"),
    ["id"],
    "*",
    {
      onSuccess: () => {
        toast.success("Transaction added successfully!");
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const form = useForm<TransactionFormValues>({
    defaultValues: {
      type,
    },
  });

  const onSubmit = (transaction: TransactionFormValues) => {
    insert([transaction]);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="wallet_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wallet</FormLabel>
              <FormControl>
                <WalletPicker {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {type !== "transfer" && (
          <FormField
            control={form.control}
            name="category_id"
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
        )}

        <FormField
          control={form.control}
          name="amount_cents"
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

        {type !== "transfer" && (
          <FormField
            control={form.control}
            name="label_id"
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
        )}

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
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
