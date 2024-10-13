"use client";

import React from "react";
import Link from "next/link";

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
        <p>{`${isIncoming ? "From" : "To"} ${counterPartyWallet.name}`}</p>
      </Link>
    );
  }

  return <p>{transaction.description}</p>;
};

export default TransactionDescription;
