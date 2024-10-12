import React, { memo } from "react";

import TransactionColor from "./transaction-color";
import TransactionDescription from "./transaction-description";
import TransactionIcon from "./transaction-icon";

import { cn } from "@/lib/utils";
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
    <div className="group flex items-center h-10 pl-2 pr-4 text-sm">
      <div className="w-12 shrink-0">
        <TransactionColor transaction={transaction} onUpdate={onUpdate} />
      </div>
      <div className="w-12 shrink-0">
        <TransactionIcon transaction={transaction} onUpdate={onUpdate} />
      </div>
      <div className="grow">
        <TransactionDescription transaction={transaction} />
      </div>
      <div className="w-24 shrink-0">
        <p
          className={cn(
            "text-right",
            transaction.amount_cents > 0 ? "text-emerald-600" : "text-red-500",
          )}
        >
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: transaction.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(transaction.amount_cents / 100)}
        </p>
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

export default memo(TransactionRow);
