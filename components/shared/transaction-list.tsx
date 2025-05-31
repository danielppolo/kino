"use client";

import { useCallback, useEffect, useMemo, useOptimistic, useRef } from "react";
import { toast } from "sonner";

import { useVirtualizer } from "@tanstack/react-virtual";

import AddTransactionButton from "./add-transaction-button";
import DayHeader, { DayHeaderLoading } from "./day-header";
import TransactionRow, { TransactionRowLoading } from "./transaction-row";

import { Database } from "@/utils/supabase/database.types";
import {
  deleteTransaction,
  updateTransaction,
} from "@/utils/supabase/mutations";
import { Transaction } from "@/utils/supabase/types";

interface TransactionListProps {
  transactions: Transaction[];
}

const dayHeaderHeight = 32;
const transactionRowHeight = 40;

export default function TransactionList({
  transactions,
}: TransactionListProps) {
  const [optimisticTransactions, addOptimisticTransaction] = useOptimistic<
    Transaction[],
    Transaction
  >(transactions, (state, newTransaction) => [newTransaction, ...state]);

  const onDelete = useCallback(async (id: string) => {
    const { error } = await deleteTransaction(id);

    if (error) {
      return toast.error(error.message);
    }
    toast.success("Transaction deleted!");
  }, []);

  const onChange = useCallback(
    async (
      transaction: Transaction,
      newTransaction: Database["public"]["Tables"]["transactions"]["Update"],
    ) => {
      const updatedFields = Object.keys(
        newTransaction,
      ) as (keyof Transaction)[];
      const hasChanges = updatedFields.some(
        (field) => newTransaction[field] !== transaction[field],
      );

      if (!hasChanges) {
        return;
      }

      const { error } = await updateTransaction({
        ...transaction,
        ...newTransaction,
      });

      if (error) {
        return toast.error(error.message);
      }
      toast.success("Transaction updated!");
    },
    [],
  );

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    optimisticTransactions.forEach((transaction) => {
      const date = transaction.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [optimisticTransactions]);

  // Virtualization Setup
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: groupedTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) =>
      dayHeaderHeight +
      groupedTransactions[index][1].length * transactionRowHeight,
    overscan: 5,
  });

  // Re-render the virtualized list when transactions change
  useEffect(() => {
    rowVirtualizer.measure();
  }, [optimisticTransactions, rowVirtualizer]);

  return (
    <div className="relative">
      <div
        ref={parentRef}
        style={{ height: "calc(100vh - 44px)", overflow: "auto" }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
          className="relative w-full"
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const [date, dateTransactions] =
              groupedTransactions[virtualRow.index];
            return (
              <div
                key={date}
                // className="divide-y"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <DayHeader date={date} />
                {dateTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    onUpdate={onChange}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="fixed right-4 bottom-4 z-50">
        <AddTransactionButton
          type="expense"
          onOptimisticSuccess={addOptimisticTransaction}
        />
      </div>
    </div>
  );
}

export const TransactionListLoading = () => {
  return (
    <div
      style={{ height: "calc(100vh - 44px - 44px)", overflow: "auto" }}
      className="relative w-full divide-y overflow-hidden"
    >
      <DayHeaderLoading />
      {Array.from({ length: 20 }).map((_, index) => (
        <TransactionRowLoading key={index} />
      ))}
    </div>
  );
};
