"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useVirtualizer } from "@tanstack/react-virtual";

import AddTransactionButton from "./add-transaction-button";
import { AmountInput } from "./amount-input";
import CategoryPicker from "./category-picker";
import { DescriptionInput } from "./description-input";
import LabelPicker from "./label-picker";

import { Database } from "@/utils/supabase/database.types";
import {
  deleteTransaction,
  updateTransaction,
} from "@/utils/supabase/mutations";
import { Category, Label, Transaction } from "@/utils/supabase/types";

interface TransactionListProps {
  walletId?: string;
  transactions: Transaction[];
  labels: Label[];
  categories: Category[];
}

export default function TransactionList({
  walletId,
  transactions,
  labels,
  categories,
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
          width: "100%",
          position: "relative",
        }}
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
              <div className="bg-muted/50 h-8 flex items-center justify-between px-4 text-xs">
                <p>{format(new Date(date), "PP")}</p>
                {walletId && (
                  <AddTransactionButton
                    labels={labels}
                    categories={categories}
                    type="expense"
                    walletId={walletId}
                    date={date}
                  />
                )}
              </div>
              {dateTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="group flex items-center h-10 px-2"
                >
                  <div className="w-12 shrink-0">
                    <LabelPicker
                      options={labels}
                      value={transaction.label_id}
                      onChange={(id: string) => {
                        onChange(transaction, { label_id: id });
                      }}
                    />
                  </div>
                  <div className="w-12 shrink-0">
                    <CategoryPicker
                      options={categories}
                      type={transaction.type}
                      value={transaction.category_id ?? undefined}
                      onChange={(id: string) => {
                        onChange(transaction, { category_id: id });
                      }}
                    />
                  </div>
                  <div className="grow">
                    <DescriptionInput
                      id={`desc-${transaction.id}`}
                      variant="ghost"
                      defaultValue={transaction.description ?? undefined}
                      onBlur={(event) => {
                        onChange(transaction, {
                          description: event.target.value,
                        });
                      }}
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <AmountInput
                      id={`amount-${transaction.id}`}
                      variant="ghost"
                      defaultValue={transaction.amount_cents / 100}
                      className={
                        transaction.type === "income"
                          ? "text-emerald-600"
                          : "text-red-500"
                      }
                      onBlur={(event) => {
                        onChange(transaction, {
                          amount_cents: Number(event.target.value) * 100,
                        });
                      }}
                    />
                  </div>
                  {/* <div className="w-32 shrink-0 flex justify-end">
                    <DaterPicker
                      id={`date-${transaction.id}`}
                      variant="ghost"
                      value={transaction.date}
                      onChange={(date?: string) => {
                        onChange(transaction, { date });
                      }}
                    />
                  </div> */}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
