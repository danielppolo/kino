"use client";

import React, { memo, useState } from "react";
import { toast } from "sonner";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "../ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Money } from "../ui/money";

import { linkTransfers } from "@/actions/link-transfers";
import { useWallets } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { Transaction, TransactionList } from "@/utils/supabase/types";

interface LinkTransferButtonProps {
  transaction: TransactionList;
}

const fetchTransferOptions = async (
  selectedCurrency: string,
  transaction: TransactionList,
  transactionWalletCurrency: string | undefined,
): Promise<Transaction[]> => {
  const supabase = createClient();

  // Add null checks for required fields
  if (
    !transaction.date ||
    !transaction.type ||
    !transaction.amount_cents ||
    !transaction.wallet_id
  ) {
    return [];
  }

  const query = supabase
    .from("transactions")
    .select("*")
    .eq("date", transaction.date)
    .eq("type", transaction.type)
    .eq("currency", selectedCurrency)
    .is("transfer_id", null);

  // If same currency, match the opposite amount
  if (selectedCurrency === transactionWalletCurrency) {
    query.eq("amount_cents", transaction.amount_cents * -1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching transfer options: ${error.message}`);
  }

  return data || [];
};

const LinkTransferButton: React.FC<LinkTransferButtonProps> = ({
  transaction,
}) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [wallets, walletMap] = useWallets();
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

  // Get unique currencies from wallets, excluding the current transaction's wallet currency
  const walletId = transaction.wallet_id ?? "";
  const transactionWallet = walletMap.get(walletId);
  const availableCurrencies = Array.from(
    new Set(
      wallets
        .filter((wallet) => wallet.id !== walletId)
        .map((wallet) => wallet.currency),
    ),
  );

  const {
    data: transactions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "transfer-options",
      selectedCurrency,
      transaction.date,
      transaction.type,
      transaction.wallet_id,
      transaction.amount_cents,
      transactionWallet?.currency,
    ],
    queryFn: () => {
      if (!selectedCurrency) {
        throw new Error("No currency selected");
      }
      return fetchTransferOptions(
        selectedCurrency,
        transaction,
        transactionWallet?.currency,
      );
    },
    enabled: !!selectedCurrency,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const onOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedCurrency(null);
      return setOpen(false);
    }

    setOpen(open);
  };

  const createCounterTransaction = async (counterTransactionId: string) => {
    if (!transaction.id) return;

    const { error } = await linkTransfers(transaction.id, counterTransactionId);
    if (error) {
      return toast.error(error.message);
    }

    toast.success("Transfer linked");
    queryClient.invalidateQueries({
      queryKey: ["transactions"],
    });
    onOpenChange(false);
  };

  // Add null checks for required fields after hooks
  if (
    !transaction.wallet_id ||
    !transaction.date ||
    !transaction.type ||
    !transaction.amount_cents
  ) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Badge variant="outline">Link</Badge>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput
            placeholder={
              selectedCurrency ? "Search transactions..." : "Search currency..."
            }
          />
          <CommandList>
            <CommandEmpty>
              {!selectedCurrency
                ? "No currency found."
                : isLoading
                  ? "Loading transactions..."
                  : error
                    ? "Error loading transactions"
                    : "No matching transactions found."}
            </CommandEmpty>
            <CommandGroup>
              {!selectedCurrency
                ? availableCurrencies.map((currency) => (
                    <CommandItem
                      key={currency}
                      value={currency}
                      onSelect={() => {
                        setSelectedCurrency(currency);
                      }}
                    >
                      {currency}
                    </CommandItem>
                  ))
                : isLoading
                  ? null
                  : transactions.map((t) => (
                      <CommandItem
                        key={t.id}
                        value={t.id}
                        onSelect={() => {
                          if (t.id) {
                            createCounterTransaction(t.id);
                          }
                        }}
                      >
                        <span>{walletMap.get(t.wallet_id)?.name}</span>
                        <Money
                          cents={t.amount_cents}
                          currency={t.currency}
                          as="span"
                        />
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
