"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

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

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (wallet: WalletFormValues) => {
      return await createWallet(wallet);
    },
    onSuccess: () => {
      toast.success("Wallet added!");
      queryClient.invalidateQueries();
      onSuccess();
    },
    onError(error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }
      toast.error("Failed to add wallet");
    },
  });

  const onSubmit = (wallet: WalletFormValues) => {
    mutation.mutate(wallet);
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

        <SubmitButton isLoading={mutation.isPending}>Add wallet</SubmitButton>
      </form>
    </Form>
  );
};

export default WalletForm;
