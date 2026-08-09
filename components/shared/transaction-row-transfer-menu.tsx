"use client";

import { ArrowRightLeft, RefreshCw } from "lucide-react";
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
type TransferAction = "create" | "convert";

export function getCrossCurrencyTransferPrefill(
  transaction: Pick<
    TransactionList,
    | "id"
    | "wallet_id"
    | "currency"
    | "amount_cents"
    | "date"
    | "description"
    | "type"
  >,
  destinationWallet: TransferDestinationWallet,
  action: TransferAction = "create",
): TransferPrefill | null {
  if (
    !transaction.wallet_id ||
    !transaction.currency ||
    typeof transaction.amount_cents !== "number" ||
    !transaction.date ||
    destinationWallet.currency === transaction.currency ||
    (action === "convert" && !transaction.id)
  ) {
    return null;
  }

  const amount = Math.abs(transaction.amount_cents) / 100;
  const convertsIncome = action === "convert" && transaction.type === "income";
  const transactionIdToConvert =
    action === "convert" ? (transaction.id ?? undefined) : undefined;

  return {
    ...(transactionIdToConvert ? { transactionIdToConvert } : {}),
    senderWalletId: convertsIncome
      ? destinationWallet.id
      : transaction.wallet_id,
    receiverWalletId: convertsIncome
      ? transaction.wallet_id
      : destinationWallet.id,
    ...(convertsIncome ? { receiverAmount: amount } : { senderAmount: amount }),
    date: transaction.date,
    description: transaction.description ?? undefined,
  };
}

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
  const isEligibleTransaction =
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

  const handleTransfer = async (
    destinationWalletId: string,
    action: TransferAction,
  ) => {
    const sourceTransactionId = transaction.id;
    const sourceWalletId = transaction.wallet_id;
    const currency = transaction.currency;
    const amountCents = transaction.amount_cents;
    const date = transaction.date;
    const destinationWallet = destinationWallets.find(
      (wallet) => wallet.id === destinationWalletId,
    );

    if (
      !sourceWalletId ||
      !currency ||
      typeof amountCents !== "number" ||
      !date ||
      !destinationWallet ||
      (action === "convert" && !sourceTransactionId)
    ) {
      return;
    }

    const amount = Math.abs(amountCents) / 100;
    const convertsIncome =
      action === "convert" && transaction.type === "income";
    const senderWalletId = convertsIncome
      ? destinationWalletId
      : sourceWalletId;
    const receiverWalletId = convertsIncome
      ? sourceWalletId
      : destinationWalletId;
    const transferPrefill = getCrossCurrencyTransferPrefill(
      transaction,
      destinationWallet,
      action,
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
        sender_wallet_id: senderWalletId,
        receiver_wallet_id: receiverWalletId,
        date,
        description: transaction.description ?? undefined,
        sender_amount: amount,
        receiver_amount: amount,
        converted_transaction_id:
          action === "convert" ? (sourceTransactionId ?? undefined) : undefined,
        converted_transaction_wallet_id:
          action === "convert" ? sourceWalletId : undefined,
        category_id: process.env.NEXT_PUBLIC_TRANSFER_CATEGORY_BETWEEN_ID!,
        label_id: "",
      });
      toast.success(
        action === "convert"
          ? "Transaction converted to a transfer"
          : "Separate transfer created",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create transfer",
      );
    }
  };

  return (
    <>
      <ContextMenuSub>
        <ContextMenuSubTrigger className="gap-2 py-2">
          <ArrowRightLeft className="size-4 shrink-0" />
          <span className="flex flex-col items-start leading-tight">
            <span>Create separate transfer</span>
            <span className="text-muted-foreground text-xs">
              Keeps this transaction unchanged
            </span>
          </span>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="min-w-48">
          {destinationWallets.map((wallet) => (
            <ContextMenuItem
              key={wallet.id}
              disabled={createTransferMutation.isPending}
              onSelect={() => void handleTransfer(wallet.id, "create")}
            >
              <span>{wallet.name}</span>
              <span className="text-muted-foreground ml-auto pl-4 text-xs">
                {wallet.currency}
              </span>
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>

      {transaction.id ? (
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2 py-2">
            <RefreshCw className="size-4 shrink-0" />
            <span className="flex flex-col items-start leading-tight">
              <span>Convert to transfer</span>
              <span className="text-muted-foreground text-xs">
                Reclassifies this transaction
              </span>
            </span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="min-w-48">
            {destinationWallets.map((wallet) => (
              <ContextMenuItem
                key={wallet.id}
                disabled={createTransferMutation.isPending}
                onSelect={() => void handleTransfer(wallet.id, "convert")}
              >
                <span>{wallet.name}</span>
                <span className="text-muted-foreground ml-auto pl-4 text-xs">
                  {wallet.currency}
                </span>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      ) : null}
    </>
  );
}
