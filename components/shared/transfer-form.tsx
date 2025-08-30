"use client";

import { useState } from "react";
import { format } from "date-fns";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import DaterPicker from "../ui/date-picker";
import { AmountInput } from "./amount-input";
import { DescriptionInput } from "./description-input";
import WalletPicker from "./wallet-picker";

import { createTransferTransaction } from "@/actions/create-transfer";
import { EntityForm } from "@/components/shared/entity-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useWallets } from "@/contexts/settings-context";
import { Database } from "@/utils/supabase/database.types";
import { deleteTransfer, updateTransfer } from "@/utils/supabase/mutations";
import { Transaction } from "@/utils/supabase/types";

interface TransferFormProps {
  walletId: string;
  date?: string;
  type: "income" | "expense" | "transfer";
  onSuccess?: () => void;
  initialData?: Transaction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type TransferFormValues = Omit<
  Database["public"]["Tables"]["transactions"]["Insert"],
  "amount_cents" | "wallet_id"
> & {
  sender_wallet_id: string;
  receiver_wallet_id: string;
  amount: number;
};

const TransferForm = ({
  walletId,
  date = format(Date.now(), "yyyy-MM-dd"),
  type,
  onSuccess,
  initialData,
  open,
  onOpenChange,
}: TransferFormProps) => {
  const [, walletMap] = useWallets();
  const [addAnother, setAddAnother] = useState(false);
  const currency = walletMap.get(walletId)?.currency ?? "USD";
  const isEdit = !!initialData;
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (values: TransferFormValues) => {
      const { sender_wallet_id, receiver_wallet_id, ...transaction } = values;
      const { error } = await createTransferTransaction(
        { ...transaction },
        sender_wallet_id,
        receiver_wallet_id,
      );
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: TransferFormValues) => {
      if (!initialData?.transfer_id) throw new Error("No transfer ID provided");
      await updateTransfer(initialData.transfer_id, {
        description: values.description ?? undefined,
        amount_cents: values.amount * 100,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      onSuccess?.();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!initialData?.transfer_id) throw new Error("No transfer ID provided");
      await deleteTransfer(initialData.transfer_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      onSuccess?.();
    },
  });

  const defaultValues: TransferFormValues = {
    type: initialData?.type ?? type,
    sender_wallet_id: initialData?.wallet_id ?? walletId,
    receiver_wallet_id: initialData?.transfer_id ?? "",
    date: initialData?.date ?? date,
    currency: initialData?.currency ?? currency,
    description: initialData?.description ?? undefined,
    amount: initialData ? initialData.amount_cents / 100 : undefined,
  };

  const handleSubmit = async (data: TransferFormValues) => {
    const normalizedData = { ...data, amount: Math.abs(data.amount) };

    if (isEdit) {
      try {
        await updateMutation.mutateAsync(normalizedData);
        return { error: undefined };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    try {
      await createMutation.mutateAsync(normalizedData);

      if (addAnother) {
        // Reset all fields except date
        const prevDate = normalizedData.date;
        return {
          error: undefined,
          resetValues: {
            ...defaultValues,
            date: prevDate,
          },
        };
      }

      return { error: undefined };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const convertToFormValues = (
    transaction: Transaction,
  ): TransferFormValues => ({
    type: transaction.type,
    sender_wallet_id: transaction.wallet_id,
    receiver_wallet_id: transaction.transfer_id ?? "",
    date: transaction.date,
    currency: transaction.currency,
    description: transaction.description ?? undefined,
    amount: transaction.amount_cents / 100,
  });

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      return { error: undefined };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return (
    <EntityForm
      title="Transfer"
      entity={initialData ? convertToFormValues(initialData) : undefined}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      addAnother={addAnother}
      setAddAnother={setAddAnother}
      onDelete={handleDelete}
      isLoading={
        createMutation.isPending ||
        updateMutation.isPending ||
        deleteMutation.isPending
      }
    >
      <FormField
        name="amount"
        rules={{
          required: "Amount is required",
          min: { value: 0.01, message: "Amount must be positive" },
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Amount</FormLabel>
            <FormControl>
              <AmountInput {...field} autoFocus />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
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

      {!isEdit && (
        <>
          <FormField
            name="date"
            rules={{ required: "Date is required" }}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <DaterPicker {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <FormField
              name="sender_wallet_id"
              rules={{ required: "Sender wallet is required" }}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Sender Wallet</FormLabel>
                  <FormControl>
                    <WalletPicker
                      currency={currency}
                      className="w-full"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="receiver_wallet_id"
              rules={{ required: "Receiver wallet is required" }}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Receiver Wallet</FormLabel>
                  <FormControl>
                    <WalletPicker
                      currency={currency}
                      className="w-full"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}
    </EntityForm>
  );
};

export default TransferForm;
