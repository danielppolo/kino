"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { SubmitButton } from "../submit-button";
import { Input } from "../ui/input";
import CurrencyPicker from "./currency-picker";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Database } from "@/utils/supabase/database.types";
import { createWallet } from "@/utils/supabase/mutations";

interface WalletFormProps {
  onSuccess: () => void;
}

type WalletFormValues = Database["public"]["Tables"]["wallets"]["Insert"];

const WalletForm = ({ onSuccess }: WalletFormProps) => {
  const form = useForm<WalletFormValues>({
    defaultValues: {
      currency: "MXN",
    },
  });

  const onSubmit = async (wallet: WalletFormValues) => {
    const { error, data } = await createWallet(wallet);

    if (error) {
      console.log(error);
      return toast.error(error);
    }

    toast.success("Wallet added!");
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wallet</FormLabel>
              <FormControl>
                <Input type="text" placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <CurrencyPicker onChange={field.onChange} value={field.value} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SubmitButton>Add wallet</SubmitButton>
      </form>
    </Form>
  );
};

export default WalletForm;
