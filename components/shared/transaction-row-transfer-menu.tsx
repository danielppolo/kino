"use client";

import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "../ui/context-menu";

import { useWallets } from "@/contexts/settings-context";
import {
  type TransferPrefill,
  useTransactionForm,
} from "@/contexts/transaction-form-context";
import { useCreateTransferTransaction } from "@/hooks/use-create-transfer-transaction";
import type { TransactionList, Wallet } from "@/utils/supabase/types";

type TransferDestinationWallet = Pick<Wallet, "id" | "name" | "currency">;

export function getCrossCurrencyTransferPrefill(
  transaction: Pick<
    TransactionList,
    "id" | "wallet_id" | "currency" | "amount_cents" | "date" | "description"
  >,
  receiverWallet: TransferDestinationWallet,
): TransferPrefill | null {
  if (
    !transaction.wallet_id ||
    !transaction.id ||
    !transaction.currency ||
    typeof transaction.amount_cents !== "number" ||
    !transaction.date ||
    receiverWallet.currency === transaction.currency
  ) {
    return null;
  }

  return {
    sourceTransactionId: transaction.id,
    senderWalletId: transaction.wallet_id,
    receiverWalletId: receiverWallet.id,
    senderAmount: Math.abs(transaction.amount_cents) / 100,
    date: transaction.date,
    description: transaction.description ?? undefined,
  };
}

export function getTransferDestinationWallets<
  TWallet extends TransferDestinationWallet,
>(
  transaction: Pick<
    TransactionList,
    | "id"
    | "wallet_id"
    | "currency"
    | "amount_cents"
    | "date"
    | "type"
    | "transfer_id"
    | "transfer_wallet_id"
  >,
  wallets: TWallet[],
) {
  const sourceWalletId = transaction.wallet_id;
  const currency = transaction.currency;
  const amountCents = transaction.amount_cents;
  const date = transaction.date;
  const isEligibleTransaction =
    !!transaction.id &&
    typeof amountCents === "number" &&
    ((transaction.type === "income" && amountCents > 0) ||
      (transaction.type === "expense" && amountCents < 0)) &&
    !transaction.transfer_id &&
    !transaction.transfer_wallet_id;

  if (!isEligibleTransaction || !sourceWalletId || !currency || !date) {
    return [];
  }

  return wallets.filter((wallet) => wallet.id !== sourceWalletId);
}

interface TransactionRowTransferMenuProps {
  transaction: TransactionList;
}

export default function TransactionRowTransferMenu({
  transaction,
}: TransactionRowTransferMenuProps) {
  const [wallets] = useWallets();
  const createTransferMutation = useCreateTransferTransaction();
  const { openForm } = useTransactionForm();
  const destinationWallets = getTransferDestinationWallets(
    transaction,
    wallets,
  );

  if (!destinationWallets.length) {
    return null;
  }

  const handleCreateTransfer = async (destinationWalletId: string) => {
    const sourceTransactionId = transaction.id;
    const sourceWalletId = transaction.wallet_id;
    const currency = transaction.currency;
    const amountCents = transaction.amount_cents;
    const date = transaction.date;
    const destinationWallet = destinationWallets.find(
      (wallet) => wallet.id === destinationWalletId,
    );

    if (
      !sourceTransactionId ||
      !sourceWalletId ||
      !currency ||
      typeof amountCents !== "number" ||
      !date ||
      !destinationWallet
    ) {
      return;
    }

    const amount = Math.abs(amountCents) / 100;
    const transferPrefill = getCrossCurrencyTransferPrefill(
      transaction,
      destinationWallet,
    );
    if (transferPrefill) {
      openForm({
        type: "transfer",
        walletId: sourceWalletId,
        transferPrefill,
      });
      return;
    }

    try {
      await createTransferMutation.mutateAsync({
        type: "transfer",
        sender_wallet_id: sourceWalletId,
        receiver_wallet_id: destinationWalletId,
        date,
        description: transaction.description ?? undefined,
        sender_amount: amount,
        receiver_amount: amount,
        source_transaction_id: sourceTransactionId,
        category_id: process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID!,
        label_id: "",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create transfer",
      );
    }
  };

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="gap-2">
        <ArrowRightLeft className="size-4" />
        Transfer
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="min-w-48">
        {destinationWallets.map((wallet) => (
          <ContextMenuItem
            key={wallet.id}
            disabled={createTransferMutation.isPending}
            onSelect={() => void handleCreateTransfer(wallet.id)}
          >
            <span>{wallet.name}</span>
            <span className="text-muted-foreground ml-auto pl-4 text-xs">
              {wallet.currency}
            </span>
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
