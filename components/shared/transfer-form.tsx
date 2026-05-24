"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
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
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
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

type TransferTransaction = Transaction & {
  transfer_id?: string | null;
  transfer_wallet_id?: string | null;
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
      invalidateWorkspaceQueries(queryClient);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: TransferFormValues) => {
      const transferId = (initialData as TransferTransaction | undefined)?.transfer_id;
      if (!transferId) throw new Error("No transfer ID provided");
      await updateTransfer(transferId, {
        description: values.description ?? undefined,
        amount_cents: values.amount * 100,
      });
    },
    onSuccess: () => {
      invalidateWorkspaceQueries(queryClient);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const transferId = (initialData as TransferTransaction | undefined)?.transfer_id;
      if (!transferId) throw new Error("No transfer ID provided");
      await deleteTransfer(transferId);
    },
    onSuccess: () => {
      invalidateWorkspaceQueries(queryClient);
    },
  });

  const defaultValues: TransferFormValues = {
    type: initialData?.type ?? type,
    sender_wallet_id: initialData?.wallet_id ?? walletId,
    receiver_wallet_id: "",
    date: initialData?.date ?? date,
    currency: initialData?.currency ?? currency,
    description: initialData?.description ?? undefined,
    amount: initialData ? Math.abs(initialData.amount_cents) / 100 : 0,
    category_id:
      initialData?.category_id ??
      process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID!,
    label_id: initialData?.label_id ?? "",
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
        // Reset all fields except date, using fresh default values
        const prevDate = normalizedData.date;
        return {
          error: undefined,
          resetValues: {
            type: type,
            sender_wallet_id: walletId,
            receiver_wallet_id: "",
            date: prevDate,
            currency: currency,
            description: undefined,
            amount: 0,
            category_id: process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID!,
            label_id: "",
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
    receiver_wallet_id:
      (transaction as TransferTransaction).transfer_wallet_id ?? "",
    date: transaction.date,
    currency: transaction.currency,
    description: transaction.description ?? undefined,
    amount: Math.abs(transaction.amount_cents) / 100,
    category_id: transaction.category_id,
    label_id: transaction.label_id ?? "",
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

  // Component to handle wallet field changes with constraint enforcement
  const WalletFieldWithConstraint = ({
    field,
    otherFieldName,
    currency: fieldCurrency,
  }: {
    field: {
      value: string;
      onChange: (value: string) => void;
    };
    otherFieldName: "sender_wallet_id" | "receiver_wallet_id";
    currency: string;
  }) => {
    const { setValue } = useFormContext<TransferFormValues>();

    const handleChange = (value: string) => {
      field.onChange(value);
      // If the changed field is not the walletId prop, set the other field to walletId
      if (value !== walletId) {
        setValue(otherFieldName, walletId);
      }
    };

    return (
      <WalletPicker
        currency={fieldCurrency}
        className="w-full"
        value={field.value}
        onChange={handleChange}
      />
    );
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
                    <WalletFieldWithConstraint
                      field={field}
                      otherFieldName="receiver_wallet_id"
                      currency={currency}
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
                    <WalletFieldWithConstraint
                      field={field}
                      otherFieldName="sender_wallet_id"
                      currency={currency}
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
