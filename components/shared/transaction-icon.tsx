import React from "react";
import { ArrowDownFromLine, ArrowUpFromLine } from "lucide-react";

import { Button } from "../ui/button";
import CategoryPicker from "./category-picker";

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
    return (
      <Button variant="ghost" size="sm">
        {transaction.amount_cents > 0 ? (
          <ArrowDownFromLine className="size-4" />
        ) : (
          <ArrowUpFromLine className="size-4" />
        )}
      </Button>
    );
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
