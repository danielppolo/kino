"use client";

import React from "react";
import Link from "next/link";

import { Text } from "../ui/typography";

import { useWallets } from "@/contexts/settings-context";
import { Transaction } from "@/utils/supabase/types";

interface TransactionDescriptionProps {
  transaction: Transaction;
}

const TransactionDescription: React.FC<TransactionDescriptionProps> = ({
  transaction,
}) => {
  const [, walletsMap] = useWallets();
  const counterPartyWallet =
    !!transaction.transfer_wallet_id &&
    walletsMap.get(transaction.transfer_wallet_id);

  if (transaction.type === "transfer" && counterPartyWallet) {
    const isIncoming = transaction.amount_cents > 0;
    return (
      <Link href={`/app/transactions/${transaction.transfer_wallet_id}`}>
        <Text>{`${isIncoming ? "From" : "To"} ${counterPartyWallet.name}`}</Text>
      </Link>
    );
  }

  return (
    <div>
      <Text>{transaction.description}</Text>
      <Text>{transaction.note}</Text>
    </div>
  );
};

export default TransactionDescription;
