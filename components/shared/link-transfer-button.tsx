"use client";

import React, { memo, useEffect, useState } from "react";
import { ArrowDownFromLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

import { linkTransfers } from "@/actions/link-transfers";
import { useWallets } from "@/contexts/settings-context";
import { formatCents } from "@/utils/format-cents";
import { createClient } from "@/utils/supabase/client";
import { Transaction } from "@/utils/supabase/types";

interface LinkTransferButtonProps {
  transaction: Transaction;
}
const LinkTransferButton: React.FC<LinkTransferButtonProps> = ({
  transaction,
}) => {
  const [open, setOpen] = useState(false);
  const [wallets, walletMap] = useWallets();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const filteredWallets = wallets.filter(
    (wallet) => wallet.id !== transaction.wallet_id,
  );

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedWallet) return;

      const targetWallet = walletMap.get(selectedWallet);
      const transactionWallet = walletMap.get(transaction.wallet_id);
      const supabase = await createClient();
      const query = supabase
        .from("transactions")
        .select("*")
        .eq("date", transaction.date)
        .eq("type", transaction.type)
        .eq("wallet_id", selectedWallet)
        .is("transfer_id", null)
        .neq("wallet_id", transaction.wallet_id);
      if (targetWallet?.currency === transactionWallet?.currency) {
        query.eq("amount_cents", transaction.amount_cents * -1);
      }

      const { data, error } = await query;

      if (error) {
        return console.error("Error fetching transfer options:", error);
      }

      setTransactions(data);
    };

    fetchTransactions();
  }, [selectedWallet]);

  const onOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedWallet(null);
      return setOpen(false);
    }

    setOpen(open);
  };

  const createCounterTransaction = async (counterTransactionId: string) => {
    const { error } = await linkTransfers(transaction.id, counterTransactionId);
    if (error) {
      return toast.error(error.message);
    }

    toast.success("Transactions fetched");
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          {transaction.amount_cents < 0 ? (
            <ArrowUpFromLine className="size-4" />
          ) : (
            <ArrowDownFromLine className="size-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder={
              selectedWallet ? "Search transactions..." : "Search wallet..."
            }
          />
          <CommandList>
            <CommandEmpty>
              {!selectedWallet
                ? "No wallet found."
                : "No matching transactions found."}
            </CommandEmpty>
            <CommandGroup>
              {!selectedWallet
                ? filteredWallets.map((wallet) => (
                    <CommandItem
                      key={wallet.id}
                      value={wallet.id}
                      onSelect={() => {
                        setSelectedWallet(wallet.id);
                      }}
                    >
                      {wallet.name}
                    </CommandItem>
                  ))
                : transactions.map((t) => (
                    <CommandItem
                      key={t.id}
                      value={t.id}
                      onSelect={() => {
                        createCounterTransaction(t.id);
                      }}
                    >
                      {`${walletMap.get(t.wallet_id)?.name} ${formatCents(t.amount_cents)}`}
                    </CommandItem>
                  ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default memo(
  LinkTransferButton,
  (prevProps, nextProps) =>
    prevProps.transaction.id === nextProps.transaction.id,
);
