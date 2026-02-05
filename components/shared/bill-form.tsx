"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Input } from "../ui/input";
import WalletMultiSelect from "./wallet-multi-select";

import { Button } from "@/components/ui/button";
import DaterPicker from "@/components/ui/date-picker";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useWallets } from "@/contexts/settings-context";
import { Database } from "@/utils/supabase/database.types";
import { createBill } from "@/utils/supabase/mutations";

interface BillFormProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultWalletId?: string;
}

interface BillFormValues {
  wallet_ids: string[];
  description: string;
  amount: string;
  due_date: string;
}

export function BillForm({
  onSuccess,
  open,
  onOpenChange,
  defaultWalletId,
}: BillFormProps) {
  const [wallets] = useWallets();
  const queryClient = useQueryClient();

  const defaultWallet = defaultWalletId
    ? wallets.find((w) => w.id === defaultWalletId)
    : wallets[0];

  const form = useForm<BillFormValues>({
    defaultValues: {
      wallet_ids: defaultWallet?.id ? [defaultWallet.id] : [],
      description: "",
      amount: "",
      due_date: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (defaultWallet) {
      form.reset({
        wallet_ids: [defaultWallet.id],
        description: "",
        amount: "",
        due_date: new Date().toISOString().split("T")[0],
      });
    }
  }, [defaultWallet, form]);

  const selectedWalletIds = form.watch("wallet_ids");
  const selectedWallets = wallets.filter((w) =>
    selectedWalletIds?.includes(w.id),
  );
  const currenciesLabel = Array.from(
    new Set(selectedWallets.map((w) => w.currency)),
  ).join(", ");

  const createMutation = useMutation({
    mutationFn: async (values: BillFormValues) => {
      const walletIds =
        values.wallet_ids.length > 0 ? values.wallet_ids : [];
      const results = await Promise.all(
        walletIds.map(async (walletId) => {
          const wallet = wallets.find((w) => w.id === walletId);
          const data: Database["public"]["Tables"]["bills"]["Insert"] = {
            wallet_id: walletId,
            description: values.description,
            amount_cents: Math.round(parseFloat(values.amount) * 100),
            currency: wallet?.currency ?? "USD",
            due_date: values.due_date,
            is_recurring: false,
          };
          return await createBill(data);
        }),
      );
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["bills-with-payments"] });
      const count = results.length;
      toast.success(
        count === 1 ? "Bill added successfully!" : `${count} bills added successfully!`,
      );
      onSuccess?.();
    },
    onError(error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to add bill");
      }
    },
  });

  const onSubmit = (values: BillFormValues) => {
    createMutation.mutate(values);
  };

  return (
    <DrawerDialog
      title="Add Bill"
      open={open}
      onOpenChange={onOpenChange}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="wallet_ids"
            rules={{
              validate: (value) =>
                value.length > 0 || "At least one wallet is required",
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wallets</FormLabel>
                <FormControl>
                  <WalletMultiSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={wallets}
                    placeholder="Select one or more wallets"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            rules={{ required: "Description is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g., One-time fee, Medical bill"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            rules={{
              required: "Amount is required",
              validate: (value) =>
                parseFloat(value) > 0 || "Amount must be positive",
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Amount {currenciesLabel && `(${currenciesLabel})`}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="due_date"
            rules={{ required: "Due date is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <DaterPicker
                    value={field.value}
                    onChange={(date) => field.onChange(date)}
                    variant="outline"
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </Form>
    </DrawerDialog>
  );
}

export default BillForm;
