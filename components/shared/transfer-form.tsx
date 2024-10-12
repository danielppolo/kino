"use client";

import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { toast } from "sonner";

import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import { DescriptionInput } from "./description-input";
import WalletPicker from "./wallet-picker";

import { createTransferTransaction } from "@/actions/create-transfer";
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

interface TransferFormProps {
  walletId: string;
  date?: string;
  type: "income" | "expense" | "transfer";
  onSuccess: () => void;
}

type TransferFormValues = Omit<
  Database["public"]["Tables"]["transactions"]["Insert"],
  "amount_cents"
> & {
  counterpart_wallet_id: string;
  amount: number;
};

const TransferForm = ({
  walletId,
  date = format(Date.now(), "yyyy-MM-dd"),
  type,
  onSuccess,
}: TransferFormProps) => {
  const [, walletDict] = useWallets();
  const currency = walletDict[walletId]?.currency;
  const form = useForm<TransferFormValues>({
    defaultValues: {
      type,
      wallet_id: walletId,
      date,
      currency,
    },
  });

  const onSubmit = async (data: TransferFormValues) => {
    const { counterpart_wallet_id, ...transaction } = data;
    const { error } = await createTransferTransaction(
      transaction,
      counterpart_wallet_id,
    );

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
          rules={{ required: "Category is required" }}
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
          name="counterpart_wallet_id"
          rules={{ required: "Category is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transfer to</FormLabel>
              <FormControl>
                <WalletPicker
                  currency={currency}
                  exclude={walletId}
                  {...field}
                />
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

export default TransferForm;
