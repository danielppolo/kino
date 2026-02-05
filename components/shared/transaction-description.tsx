"use client";

import React from "react";

import { Text } from "../ui/typography";

import { useCategories, useWallets } from "@/contexts/settings-context";
import { TransactionList } from "@/utils/supabase/types";

interface TransactionDescriptionProps {
  transaction: TransactionList;
}

const TransactionDescription: React.FC<TransactionDescriptionProps> = ({
  transaction,
}) => {
  const [, walletsMap] = useWallets();
  const [, categoriesMap] = useCategories();
  const category =
    !!transaction.category_id && categoriesMap.get(transaction.category_id);

  const counterPartyWallet =
    !!transaction.transfer_wallet_id &&
    walletsMap.get(transaction.transfer_wallet_id);

  if (transaction.type === "transfer" && counterPartyWallet) {
    const isIncoming = (transaction.amount_cents ?? 0) > 0;
    return (
      <div className="flex gap-1">
        <Text>{`${isIncoming ? "From" : "To"} ${counterPartyWallet.name}`}</Text>
        <Text className="text-muted-foreground">{transaction.description}</Text>
      </div>
    );
  }

  const categoryName =
    category && typeof category === "object" && "name" in category
      ? (category as { name: string }).name
      : "";
  return (
    <div className="flex gap-1">
      <Text>{categoryName}</Text>
      <Text className="text-muted-foreground">{transaction.description}</Text>
    </div>
  );
};

export default TransactionDescription;
