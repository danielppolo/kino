import React, { memo } from "react";

import TransactionAmount from "./transaction-amount";
import TransactionColor from "./transaction-color";
import TransactionDescription from "./transaction-description";
import TransactionIcon from "./transaction-icon";

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
    <div className="group flex items-center h-10 pl-2 pr-4 text-sm gap-2">
      <div className="shrink-0">
        <TransactionColor transaction={transaction} onUpdate={onUpdate} />
      </div>
      <div className="shrink-0">
        <TransactionIcon transaction={transaction} onUpdate={onUpdate} />
      </div>
      <div className="grow shrink truncate">
        <TransactionDescription transaction={transaction} />
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
    </div>
  );
};

export const TransactionRowLoading = () => {
  return (
    <div className="group flex items-center h-10 pl-2 pr-4 text-sm animate-pulse">
      <div className="w-12 shrink-0 p-2">
        <div className="h-4 w-full rounded-md bg-muted" />
      </div>
      <div className="w-12 shrink-0 p-2">
        <div className="h-4 w-full rounded-md bg-muted" />
      </div>
      <div className="grow p-2">
        <div className="h-4 w-1/2 rounded-md bg-muted" />
      </div>
      <div className="w-24 shrink-0 p-2">
        <div className="h-4 w-full rounded-md bg-muted" />
      </div>
    </div>
  );
};

export default memo(
  TransactionRow,
  (prevProps, nextProps) =>
    prevProps.transaction.id === nextProps.transaction.id,
);
