"use client";

import { toast } from "sonner";

import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "../ui/context-menu";

import { useWallets } from "@/contexts/settings-context";
import { useCreateTransferTransaction } from "@/hooks/use-create-transfer-transaction";
import type { TransactionList, Wallet } from "@/utils/supabase/types";

type TransferDestinationWallet = Pick<Wallet, "id" | "name" | "currency">;

export function getTransferDestinationWallets<
  TWallet extends TransferDestinationWallet,
>(
  transaction: Pick<
    TransactionList,
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
  const isEligibleIncome =
    transaction.type === "income" &&
    typeof amountCents === "number" &&
    amountCents > 0 &&
    !transaction.transfer_id &&
    !transaction.transfer_wallet_id;

  if (!isEligibleIncome || !sourceWalletId || !currency || !date) {
    return [];
  }

  return wallets.filter(
    (wallet) => wallet.id !== sourceWalletId && wallet.currency === currency,
  );
}

interface TransactionRowTransferMenuProps {
  transaction: TransactionList;
}

export default function TransactionRowTransferMenu({
  transaction,
}: TransactionRowTransferMenuProps) {
  const [wallets] = useWallets();
  const createTransferMutation = useCreateTransferTransaction();
  const destinationWallets = getTransferDestinationWallets(
    transaction,
    wallets,
  );

  if (!destinationWallets.length) {
    return null;
  }

  const handleCreateTransfer = async (destinationWalletId: string) => {
    const sourceWalletId = transaction.wallet_id;
    const currency = transaction.currency;
    const amountCents = transaction.amount_cents;
    const date = transaction.date;

    if (!sourceWalletId || !currency || typeof amountCents !== "number" || !date) {
      return;
    }

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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create transfer",
      );
    }
  };

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>Transfer</ContextMenuSubTrigger>
      <ContextMenuSubContent>
        {destinationWallets.map((wallet) => (
          <ContextMenuItem
            key={wallet.id}
            disabled={createTransferMutation.isPending}
            onSelect={() => void handleCreateTransfer(wallet.id)}
          >
            {wallet.name}
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
