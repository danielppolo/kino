import React, { memo } from "react";

import { ListItem } from "../ui/list-item";
import TagBadges from "./tag-badges";
import TransactionAmount from "./transaction-amount";
import TransactionDescription from "./transaction-description";

import { Transaction } from "@/utils/supabase/types";

interface TransactionRowProps {
  transaction: Transaction;
  onUpdate: (
    transaction: Transaction,
    updatedFields: Partial<Transaction>,
  ) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  onUpdate,
}) => {
  return (
    <ListItem className="group gap-4 px-4" id={transaction.id}>
      {/* <div className="shrink-0">
        <TransactionColor transaction={transaction} onUpdate={onUpdate} />
      </div>
      <div className="shrink-0">
        <TransactionIcon transaction={transaction} onUpdate={onUpdate} />
      </div> */}
      <div className="shrink grow truncate">
        <TransactionDescription transaction={transaction} />
      </div>
      <div className="shrink-0">
        <TagBadges transaction={transaction} />
      </div>
      <div className="shrink-0">
        <TransactionAmount
          className="text-right"
          amount={transaction.amount_cents}
          currency={transaction.currency}
        />
      </div>
      {/* <div className="w-32 shrink-0 flex justify-end">
                    <DaterPicker
                      id={`date-${transaction.id}`}
                      variant="ghost"
                      value={transaction.date}
                      onChange={(date?: string) => {
                        onUpdate(transaction, { date });
                      }}
                    />
                  </div> */}
    </ListItem>
  );
};

export const TransactionRowLoading = () => {
  return (
    <div className="group flex h-10 animate-pulse items-center text-sm">
      <div className="w-12 shrink-0 p-2">
        <div className="bg-muted h-4 w-full rounded-md" />
      </div>
      <div className="w-12 shrink-0 p-2">
        <div className="bg-muted h-4 w-full rounded-md" />
      </div>
      <div className="grow p-2">
        <div className="bg-muted h-4 w-1/2 rounded-md" />
      </div>
      <div className="w-24 shrink-0 p-2">
        <div className="bg-muted h-4 w-full rounded-md" />
      </div>
    </div>
  );
};

export default memo(
  TransactionRow,
  (prevProps, nextProps) =>
    prevProps.transaction.id === nextProps.transaction.id,
);
