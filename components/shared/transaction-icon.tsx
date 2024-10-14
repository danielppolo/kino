import React from "react";
import { ArrowRightLeft } from "lucide-react";

import { Button } from "../ui/button";
import CategoryPicker from "./category-picker";
import LinkTransferButton from "./link-transfer-button";

import { Transaction } from "@/utils/supabase/types";

interface TransactionIconProps {
  transaction: Transaction;
  onUpdate: (transaction: Transaction, updates: Partial<Transaction>) => void;
}

const TransactionIcon: React.FC<TransactionIconProps> = ({
  transaction,
  onUpdate,
}) => {
  if (transaction.type === "transfer") {
    if (transaction.transfer_id)
      return (
        <Button variant="ghost" size="sm" disabled>
          <ArrowRightLeft className="size-4" />
        </Button>
      );
    return <LinkTransferButton transaction={transaction} />;
  }

  return (
    <CategoryPicker
      type={transaction.type}
      value={transaction.category_id ?? undefined}
      onChange={(id: string) => {
        onUpdate(transaction, { category_id: id });
      }}
    />
  );
};

export default TransactionIcon;
