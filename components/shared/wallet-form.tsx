"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useInsertMutation } from "@supabase-cache-helpers/postgrest-react-query";

import { Input } from "../ui/input";

import { Button } from "@/components/ui/button";
import {
  Form,
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
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/utils/supabase/database.types";

const supabase = createClient();

interface WalletFormProps {
  onSuccess: () => void;
}

type WalletFormValues = Database["public"]["Tables"]["wallets"]["Insert"];

const WalletForm = ({ onSuccess }: WalletFormProps) => {
  const { mutateAsync: insert } = useInsertMutation(
    supabase.from("wallets"),
    ["id"],
    "*",
    {
      onSuccess: () => {
        toast.success("Wallet added successfully!");
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const form = useForm<WalletFormValues>({
    defaultValues: {
      currency: "MXN",
    },
  });

  const onSubmit = (wallet: WalletFormValues) => {
    insert([wallet]);
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

        <Button type="submit">Add wallet</Button>
      </form>
    </Form>
  );
};

export default WalletForm;
