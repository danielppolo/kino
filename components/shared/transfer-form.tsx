"use client";

import { useState } from "react";
import { format } from "date-fns";

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
  const currency = walletMap.get(walletId)?.currency;
  const isEdit = !!initialData;

  const defaultValues: TransferFormValues = {
    type: initialData?.type ?? type,
    sender_wallet_id: initialData?.wallet_id ?? walletId,
    receiver_wallet_id: initialData?.transfer_wallet_id ?? "",
    date: initialData?.date ?? date,
    currency: initialData?.currency ?? currency,
    description: initialData?.description ?? undefined,
    amount: initialData ? initialData.amount_cents / 100 : 0,
  };

  const handleSubmit = async (data: TransferFormValues) => {
    if (isEdit) {
      if (!initialData?.transfer_id)
        return { error: "No transfer ID provided" };
      const { error } = await updateTransfer(initialData.transfer_id, {
        description: data.description,
        amount_cents: data.amount * 100,
      });
      if (error) return { error: error.message };
      return { error: undefined };
    }

    const { sender_wallet_id, receiver_wallet_id, ...transaction } = data;
    const { error } = await createTransferTransaction(
      { ...transaction },
      sender_wallet_id,
      receiver_wallet_id,
    );

    if (error) {
      return { error };
    }

    if (addAnother) {
      // Reset all fields except date
      const prevDate = data.date;
      return {
        error: undefined,
        resetValues: {
          ...defaultValues,
          date: prevDate,
        },
      };
    }

    return { error: undefined };
  };

  const convertToFormValues = (
    transaction: Transaction,
  ): TransferFormValues => ({
    type: transaction.type,
    sender_wallet_id: transaction.wallet_id,
    receiver_wallet_id: transaction.transfer_wallet_id ?? "",
    date: transaction.date,
    currency: transaction.currency,
    description: transaction.description ?? undefined,
    amount: transaction.amount_cents / 100,
  });

  const handleDelete = async () => {
    if (!initialData?.transfer_id) return { error: "No transfer ID provided" };
    const { error } = await deleteTransfer(initialData.transfer_id);
    return { error: error?.message };
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
    >
      <FormField
        name="amount"
        rules={{ required: "Amount is required" }}
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
                      exclude={field.value}
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
                      exclude={field.value}
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
