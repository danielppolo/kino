"use client";

import { useEffect } from "react";
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
import {
  createRecurrentBill,
  updateRecurrentBill,
} from "@/utils/supabase/mutations";

type RecurrentBill = Database["public"]["Tables"]["recurrent_bills"]["Row"];

interface BillFormProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  recurrentBill?: RecurrentBill;
  defaultWalletId?: string;
}

interface BillFormValues {
  wallet_id: string;
  wallet_ids: string[];
  description: string;
  amount: string;
  start_date: string;
  end_date: string;
  interval_type: string;
}

const BillForm = ({
  onSuccess,
  open,
  onOpenChange,
  recurrentBill,
  defaultWalletId,
}: BillFormProps) => {
  const isEdit = !!recurrentBill;
  const [wallets] = useWallets();
  const queryClient = useQueryClient();

  const defaultWallet = defaultWalletId
    ? wallets.find((w) => w.id === defaultWalletId)
    : wallets[0];

  const form = useForm<BillFormValues>({
    defaultValues: {
      wallet_id:
        recurrentBill?.wallet_id ?? defaultWallet?.id ?? "",
      wallet_ids: recurrentBill?.wallet_id
        ? [recurrentBill.wallet_id]
        : defaultWallet?.id
          ? [defaultWallet.id]
          : [],
      description: recurrentBill?.description ?? "",
      amount: recurrentBill
        ? (Math.abs(recurrentBill.amount_cents) / 100).toString()
        : "",
      start_date:
        recurrentBill?.start_date ??
        new Date().toISOString().split("T")[0],
      end_date: recurrentBill?.end_date ?? "",
      interval_type: recurrentBill?.interval_type ?? "monthly",
    },
  });

  useEffect(() => {
    if (recurrentBill) {
      form.reset({
        wallet_id: recurrentBill.wallet_id,
        wallet_ids: [recurrentBill.wallet_id],
        description: recurrentBill.description,
        amount: (Math.abs(recurrentBill.amount_cents) / 100).toString(),
        start_date: recurrentBill.start_date,
        end_date: recurrentBill.end_date ?? "",
        interval_type: recurrentBill.interval_type,
      });
    } else if (defaultWallet) {
      form.reset({
        wallet_id: defaultWallet.id,
        wallet_ids: [defaultWallet.id],
        description: "",
        amount: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        interval_type: "monthly",
      });
    }
  }, [recurrentBill, defaultWallet, form]);

  const selectedWalletId = form.watch("wallet_id");
  const selectedWalletIds = form.watch("wallet_ids");
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);

  const selectedWallets = wallets.filter((w) =>
    selectedWalletIds?.includes(w.id),
  );

  const currenciesLabel = (() => {
    if (isEdit && selectedWallet) {
      return selectedWallet.currency;
    }
    const currencies = Array.from(
      new Set(selectedWallets.map((w) => w.currency)),
    );
    return currencies.length > 0 ? currencies.join(", ") : "";
  })();

  const createMutation = useMutation({
    mutationFn: async (values: BillFormValues) => {
      const walletIds =
        values.wallet_ids.length > 0 ? values.wallet_ids : [values.wallet_id];
      const results = await Promise.all(
        walletIds.map(async (walletId) => {
          const wallet = wallets.find((w) => w.id === walletId);
          const data: Database["public"]["Tables"]["recurrent_bills"]["Insert"] =
            {
              wallet_id: walletId,
              description: values.description,
              amount_cents: Math.round(parseFloat(values.amount) * 100),
              currency: wallet?.currency ?? "USD",
              start_date: values.start_date,
              end_date: values.end_date || null,
              interval_type: values.interval_type,
              next_due_date: values.start_date,
            };
          return await createRecurrentBill(data);
        }),
      );
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["recurrent-bills"] });
      const count = results.length;
      toast.success(
        count === 1
          ? "Recurrent bill added successfully!"
          : `${count} recurrent bills added successfully!`,
      );
      onSuccess?.();
    },
    onError(error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to add recurrent bill");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: BillFormValues) => {
      const wallet = wallets.find((w) => w.id === values.wallet_id);
      const data: Database["public"]["Tables"]["recurrent_bills"]["Update"] = {
        id: recurrentBill!.id,
        wallet_id: values.wallet_id,
        description: values.description,
        amount_cents: Math.round(parseFloat(values.amount) * 100),
        currency: wallet?.currency ?? "USD",
        start_date: values.start_date,
        end_date: values.end_date || null,
        interval_type: values.interval_type,
      };
      return await updateRecurrentBill(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurrent-bills"] });
      toast.success("Recurrent bill updated successfully!");
      onSuccess?.();
    },
    onError(error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update recurrent bill");
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
      title={isEdit ? "Edit Recurrent Bill" : "Add Recurrent Bill"}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {isEdit ? (
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
          ) : (
            <FormField
              control={form.control}
              name="wallet_ids"
              rules={{
                validate: (value) =>
                  value.length > 0 || "At least one wallet is required"
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
          )}

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
            name="start_date"
            rules={{ required: "Start date is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
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

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date (Optional)</FormLabel>
                <FormControl>
                  <DaterPicker
                    value={field.value || undefined}
                    onChange={(date) => field.onChange(date || "")}
                    variant="outline"
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interval_type"
            rules={{ required: "Interval is required" }}
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

          <Button type="submit" size="sm" className="w-full" disabled={isLoading}>
            {isLoading ? "Saving..." : isEdit ? "Save Changes" : "Save"}
          </Button>
        </form>
      </Form>
    </DrawerDialog>
  );
};

export default BillForm;

