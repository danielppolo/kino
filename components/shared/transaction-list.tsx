"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

import DayHeader, { DayHeaderLoading } from "./day-header";
import TransactionRow, { TransactionRowLoading } from "./transaction-row";

import { useTransactionForm } from "@/contexts/transaction-form-context";
import useFilters from "@/hooks/use-filters";
import { PAGE_SIZE } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import { listTransactions } from "@/utils/supabase/queries";
import { Transaction } from "@/utils/supabase/types";

interface TransactionPage {
  data: Transaction[];
  error: null;
  count: number;
}

interface InfiniteTransactionData {
  pages: TransactionPage[];
  pageParams: number[];
}

const dayHeaderHeight = 32;
const transactionRowHeight = 40;

export default function TransactionList() {
  const filters = useFilters();
  console.log(filters);
  const { openForm } = useTransactionForm();
  const {
    data,
    dataUpdatedAt,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery<TransactionPage, Error, InfiniteTransactionData>({
    queryKey: ["transactions", filters],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = createClient();
      const result = await listTransactions(supabase, {
        ...filters,
        page: pageParam as number,
        pageSize: PAGE_SIZE,
      });
      if (result.error) {
        throw result.error;
      }
      return {
        data:
          result.data?.map((t) => ({
            ...t,
            amount_cents: t.amount_cents ?? 0,
            currency: t.currency ?? "USD",
            date: t.date ?? new Date().toISOString().split("T")[0],
            id: t.id ?? "",
            wallet_id: t.wallet_id ?? "",
            type: t.type ?? "expense",
          })) ?? [],
        error: null,
        count: result.count || 0,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.data || lastPage.data.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
  });

  const handleTransactionClick = useCallback(
    (transaction: Transaction) => {
      openForm({
        type: transaction.type,
        walletId: transaction.wallet_id,
        initialData: transaction,
      });
    },
    [openForm],
  );

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    const seenIds = new Set<string>();

    data?.pages.forEach((page: TransactionPage) => {
      page.data.forEach((transaction: Transaction) => {
        // Skip if we've already seen this transaction
        if (seenIds.has(transaction.id)) return;
        seenIds.add(transaction.id);

        const date = transaction.date;
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(transaction);
      });
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [data?.pages]);

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

  // Handle infinite scroll
  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;

    if (
      lastItem.index >= groupedTransactions.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    groupedTransactions.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  // Re-render the virtualized list when transactions change
  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, dataUpdatedAt]);

  if (status === "error") {
    return <div>Error loading transactions</div>;
  }

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
                key={`${date}-${dateTransactions.map((t) => t.id).join(",")}`}
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
                    key={`${transaction.id}-${transaction.amount_cents}-${transaction.description ?? ""}-${transaction.tags?.join(",") ?? ""}-${transaction.category_id}-${transaction.label_id}`}
                    transaction={transaction}
                    onClick={() => handleTransactionClick(transaction)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {isFetchingNextPage && (
        <div className="flex justify-center p-4">
          <TransactionRowLoading />
        </div>
      )}
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
