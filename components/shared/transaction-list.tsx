"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Edit, Pencil, TentTree } from "lucide-react";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Subtitle, Text } from "../ui/typography";
import DayHeader, { DayHeaderLoading } from "./day-header";
import TransactionRow, { TransactionRowLoading } from "./transaction-row";
import BulkTransactionEditForm from "./bulk-transaction-edit-form";
import { TooltipButton } from "../ui/tooltip-button";
import { BulkActions } from "./bulk-actions";

import { useTransactionForm } from "@/contexts/transaction-form-context";
import useFilters from "@/hooks/use-filters";
import { PAGE_SIZE } from "@/utils/constants";
import { createClient } from "@/utils/supabase/client";
import { listTransactions } from "@/utils/supabase/queries";
import { type TransactionList } from "@/utils/supabase/types";

interface TransactionPage {
  data: TransactionList[];
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
  const { openForm } = useTransactionForm();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
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
    (transaction: TransactionList) => {
      if (selected.size > 0) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(transaction.id!)) next.delete(transaction.id!);
          else next.add(transaction.id!);
          return next;
        });
        return;
      }
      openForm({
        type: transaction.type!,
        walletId: transaction.wallet_id!,
        initialData: transaction as any,
      });
    },
    [openForm, selected],
  );

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: TransactionList[] } = {};
    const seenIds = new Set<string>();

    data?.pages.forEach((page: TransactionPage) => {
      page.data.forEach((transaction: TransactionList) => {
        // Skip if we've already seen this transaction
        if (seenIds.has(transaction.id!)) return;
        seenIds.add(transaction.id!);

        const date = transaction.date!;
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
  }, [rowVirtualizer, dataUpdatedAt, selected.size]);

  if (status === "error") {
    return <div>Error loading transactions</div>;
  }

  if (status === "pending") {
    return <TransactionListLoading />;
  }

  // Show empty state when no transactions
  if (!groupedTransactions.length) {
    return <TransactionListEmpty />;
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
                    key={`${transaction.id}-${transaction.amount_cents}-${transaction.description ?? ""}-${transaction.tag_ids?.join(",") ?? ""}-${transaction.category_id}-${transaction.label_id}`}
                    transaction={transaction}
                    onClick={() => handleTransactionClick(transaction)}
                    selected={selected.has(transaction.id!)}
                    selectionMode={selected.size > 0}
                    onToggleSelect={() => toggleSelected(transaction.id!)}
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
      {selected.size > 0 && (
        <BulkActions
          selectedCount={selected.size}
          onClear={() => setSelected(new Set())}
        >
          <TooltipButton
            variant="ghost"
            size="sm"
            tooltip="Edit selected transactions"
            onClick={() => setBulkOpen(true)}
          >
            <Pencil className="size-4" />
          </TooltipButton>
        </BulkActions>
      )}
      <BulkTransactionEditForm
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        transactionIds={Array.from(selected)}
        selectedTransactions={
          data?.pages
            .flatMap((page) => page.data)
            .filter((t) => selected.has(t.id!)) ?? []
        }
        onSuccess={() => {
          setBulkOpen(false);
          setSelected(new Set());
        }}
      />
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

const TransactionListEmpty = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <TentTree className="size-10 stroke-1" />
      <div className="flex flex-col items-center gap-0">
        <Subtitle className="text-foreground">No transactions found</Subtitle>
        <Text className="text-muted-foreground">
          Please try again or add a new transaction.
        </Text>
      </div>
    </div>
  );
};
