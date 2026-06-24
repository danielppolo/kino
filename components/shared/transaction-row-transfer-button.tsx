"use client";

import { useState } from "react";
import { toast } from "sonner";

import WalletPicker from "./wallet-picker";

import { useWallets } from "@/contexts/settings-context";
import { useCreateTransferTransaction } from "@/hooks/use-create-transfer-transaction";
import type { TransactionList } from "@/utils/supabase/types";

interface TransactionRowTransferButtonProps {
  transaction: TransactionList;
}

export default function TransactionRowTransferButton({
  transaction,
}: TransactionRowTransferButtonProps) {
  const [value, setValue] = useState("");
  const [wallets] = useWallets();
  const createTransferMutation = useCreateTransferTransaction();

  const sourceWalletId = transaction.wallet_id;
  const currency = transaction.currency;
  const amountCents = transaction.amount_cents;
  const date = transaction.date;
  const isEligibleIncome =
    transaction.type === "income" &&
    typeof amountCents === "number" &&
    amountCents > 0 &&
    !transaction.transfer_id &&
    !transaction.transfer_wallet_id;

  if (!isEligibleIncome || !sourceWalletId || !currency || !date) {
    return null;
  }

  const hasDestinationWallet = wallets.some(
    (wallet) => wallet.id !== sourceWalletId && wallet.currency === currency,
  );

  if (!hasDestinationWallet) {
    return null;
  }

  const handleChange = async (destinationWalletId: string) => {
    if (!destinationWalletId) {
      setValue("");
      return;
    }

    setValue(destinationWalletId);

    try {
      await createTransferMutation.mutateAsync({
        type: "transfer",
        sender_wallet_id: sourceWalletId,
        receiver_wallet_id: destinationWalletId,
        date,
        currency,
        description: transaction.description ?? undefined,
        amount: Math.abs(amountCents) / 100,
        category_id: process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID!,
        label_id: "",
      });
      setValue("");
    } catch (error) {
      setValue("");
      toast.error(
        error instanceof Error ? error.message : "Failed to create transfer",
      );
    }
  };

  return (
    <div
      className="w-0 shrink-0 overflow-hidden opacity-0 transition-all group-hover:w-[72px] group-hover:opacity-100 focus-within:w-[72px] focus-within:opacity-100"
      onClick={(event) => event.stopPropagation()}
    >
      <WalletPicker
        value={value}
        currency={currency}
        exclude={sourceWalletId}
        onChange={handleChange}
        size="sm"
        variant="secondary"
        placeholder="Transfer"
        className="h-[22px] w-[72px] px-2.5 py-0.5 text-xs font-semibold uppercase"
      />
    </div>
  );
}
