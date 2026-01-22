"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";

import { Button } from "@/components/ui/button";
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
import { createBill, updateBill } from "@/utils/supabase/mutations";
import { Bill } from "@/utils/supabase/types";

interface BillFormProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  bill?: Bill;
  defaultWalletId?: string;
}

interface BillFormValues {
  wallet_id: string;
  description: string;
  amount: string;
  due_date: string;
  is_recurring: boolean;
  interval_type: string;
}

const BillForm = ({
  onSuccess,
  open,
  onOpenChange,
  bill,
  defaultWalletId,
}: BillFormProps) => {
  const isEdit = !!bill;
  const [wallets] = useWallets();
  const queryClient = useQueryClient();

  const defaultWallet = useMemo(() => {
    if (defaultWalletId) {
      return wallets.find((w) => w.id === defaultWalletId);
    }
    return wallets[0];
  }, [wallets, defaultWalletId]);

  const form = useForm<BillFormValues>({
    defaultValues: {
      wallet_id: bill?.wallet_id ?? defaultWallet?.id ?? "",
      description: bill?.description ?? "",
      amount: bill ? (Math.abs(bill.amount_cents) / 100).toString() : "",
      due_date: bill?.due_date ?? new Date().toISOString().split("T")[0],
      is_recurring: bill?.is_recurring ?? false,
      interval_type: bill?.interval_type ?? "monthly",
    },
  });

  useEffect(() => {
    if (bill) {
      form.reset({
        wallet_id: bill.wallet_id,
        description: bill.description,
        amount: (Math.abs(bill.amount_cents) / 100).toString(),
        due_date: bill.due_date,
        is_recurring: bill.is_recurring ?? false,
        interval_type: bill.interval_type ?? "monthly",
      });
    } else if (defaultWallet) {
      form.reset({
        wallet_id: defaultWallet.id,
        description: "",
        amount: "",
        due_date: new Date().toISOString().split("T")[0],
        is_recurring: false,
        interval_type: "monthly",
      });
    }
  }, [bill, defaultWallet, form]);

  const isRecurring = form.watch("is_recurring");

  const selectedWalletId = form.watch("wallet_id");
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);

  const createMutation = useMutation({
    mutationFn: async (values: BillFormValues) => {
      const wallet = wallets.find((w) => w.id === values.wallet_id);
      const data: Database["public"]["Tables"]["bills"]["Insert"] = {
        wallet_id: values.wallet_id,
        description: values.description,
        amount_cents: Math.round(parseFloat(values.amount) * 100),
        currency: wallet?.currency ?? "USD",
        due_date: values.due_date,
        is_recurring: values.is_recurring,
        interval_type: values.is_recurring ? values.interval_type : null,
      };
      return await createBill(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Bill added successfully!");
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

  const updateMutation = useMutation({
    mutationFn: async (values: BillFormValues) => {
      const wallet = wallets.find((w) => w.id === values.wallet_id);
      const data: Database["public"]["Tables"]["bills"]["Update"] = {
        id: bill!.id,
        wallet_id: values.wallet_id,
        description: values.description,
        amount_cents: Math.round(parseFloat(values.amount) * 100),
        currency: wallet?.currency ?? "USD",
        due_date: values.due_date,
        is_recurring: values.is_recurring,
        interval_type: values.is_recurring ? values.interval_type : null,
      };
      return await updateBill(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success("Bill updated successfully!");
      onSuccess?.();
    },
    onError(error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update bill");
      }
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: BillFormValues) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <DrawerDialog
      title={isEdit ? "Edit Bill" : "Add Bill"}
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
            name="wallet_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wallet</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          {wallet.name} ({wallet.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    placeholder="e.g., Rent, Utilities, Internet"
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
                  Amount {selectedWallet && `(${selectedWallet.currency})`}
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
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_recurring"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Recurring</FormLabel>
                  <p className="text-muted-foreground text-sm">
                    Auto-create new bills on schedule
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isRecurring && (
            <FormField
              control={form.control}
              name="interval_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repeat Every</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interval" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button type="submit" size="sm" className="w-full" disabled={isLoading}>
            {isLoading ? "Saving..." : isEdit ? "Save Changes" : "Save"}
          </Button>
        </form>
      </Form>
    </DrawerDialog>
  );
};

export default BillForm;

