import React from "react";
import { ArrowRightLeft } from "lucide-react";

import { Button } from "../ui/button";
import CategoryPicker from "./category-picker";
import LinkTransferButton from "./link-transfer-button";

import { TransactionList } from "@/utils/supabase/types";

interface TransactionIconProps {
  transaction: TransactionList;
  onUpdate: (
    transaction: TransactionList,
    updates: Partial<TransactionList>,
  ) => void;
}

const TransactionIcon: React.FC<TransactionIconProps> = ({
  transaction,
  onUpdate,
}) => {
  if (transaction.type === "transfer") {
    if ("transfer_id" in transaction && transaction.transfer_id)
      return (
        <Button variant="ghost" size="sm" disabled>
          <ArrowRightLeft className="size-4" />
        </Button>
      );
    return <LinkTransferButton transaction={transaction} />;
  }

  return (
    <CategoryPicker
      type={transaction.type ?? undefined}
      value={transaction.category_id ?? undefined}
      onChange={(id: string) => {
        onUpdate(transaction, { category_id: id });
      }}
    />
  );
};

export default TransactionIcon;
