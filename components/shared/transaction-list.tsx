"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { useVirtualizer } from "@tanstack/react-virtual";

import DayHeader from "./day-header";
import TransactionRow from "./transaction-row";

import { Database } from "@/utils/supabase/database.types";
import {
  deleteTransaction,
  updateTransaction,
} from "@/utils/supabase/mutations";
import { Transaction } from "@/utils/supabase/types";

interface TransactionListProps {
  walletId?: string;
  transactions: Transaction[];
}

export default function TransactionList({
  walletId,
  transactions,
}: TransactionListProps) {
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
    transactions.forEach((transaction) => {
      const date = transaction.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [transactions]);

  // Virtualization Setup
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: groupedTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => 32 + groupedTransactions[index][1].length * 40,
    overscan: 5,
  });

  // Re-render the virtualized list when transactions change
  useEffect(() => {
    rowVirtualizer.measure();
  }, [transactions, rowVirtualizer]);

  return (
    <div
      ref={parentRef}
      style={{ height: window.innerHeight - 48 - 40, overflow: "auto" }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
        className="divide-y relative w-full"
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const [date, dateTransactions] =
            groupedTransactions[virtualRow.index];
          return (
            <div
              key={date}
              className="divide-y"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <DayHeader date={date} walletId={walletId} />
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
  );
}
