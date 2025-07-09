"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Pencil } from "lucide-react";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

import { RowLoading } from "../ui/row";
import { TooltipButton } from "../ui/tooltip-button";
import { BulkActions } from "./bulk-actions";
import BulkTransactionEditForm from "./bulk-transaction-edit-form";
import DayHeader, { DayHeaderLoading } from "./day-header";
import EmptyState from "./empty-state";
import TransactionRow from "./transaction-row";

import { useTransactionForm } from "@/contexts/transaction-form-context";
import useFilters from "@/hooks/use-filters";
import { useSelection } from "@/hooks/use-selection";
import { PAGE_SIZE } from "@/utils/constants";
import { convertTransactionsToCSV, downloadCSV } from "@/utils/csv-export";
import { createClient } from "@/utils/supabase/client";
import { listTransactions } from "@/utils/supabase/queries";
import { type Transaction, type TransactionList } from "@/utils/supabase/types";

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
  const [bulkOpen, setBulkOpen] = useState(false);
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

  const {
    selected,
    selectedCount,
    clearSelection,
    toggleSelection,
    selectAll,
  } = useSelection({
    getAllIds: () =>
      data?.pages.flatMap((page) => page.data.map((t) => t.id!)) ?? [],
  });

  const toggleSelected = useCallback(
    (id: string, shiftKey = false) => {
      toggleSelection(id, shiftKey);
    },
    [toggleSelection],
  );

  const handleTransactionClick = useCallback(
    (event: React.MouseEvent, transaction: TransactionList) => {
      if (selectedCount > 0) {
        toggleSelection(transaction.id!, event.shiftKey);
        return;
      }
      openForm({
        type: transaction.type!,
        walletId: transaction.wallet_id!,
        initialData: transaction as Transaction,
      });
    },
    [openForm, selectedCount, toggleSelection],
  );

  const handleDownload = useCallback(() => {
    const selectedTransactions =
      data?.pages
        .flatMap((page) => page.data)
        .filter((t) => selected.includes(t.id!)) ?? [];

    if (selectedTransactions.length === 0) return;

    const csvContent = convertTransactionsToCSV(selectedTransactions);
    const filename = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(csvContent, filename);
  }, [data?.pages, selected]);

  // Group transactions by date or handle flat list for amount sorting
  const groupedTransactions = useMemo(() => {
    const seenIds = new Set<string>();
    const allTransactions: TransactionList[] = [];

    data?.pages.forEach((page: TransactionPage) => {
      page.data.forEach((transaction: TransactionList) => {
        // Skip if we've already seen this transaction
        if (seenIds.has(transaction.id!)) return;
        seenIds.add(transaction.id!);
        allTransactions.push(transaction);
      });
    });

    // If sorting by amount, return as flat list without date grouping
    if (filters.sort === "amount_cents") {
      return [["", allTransactions] as [string, TransactionList[]]];
    }

    // Group by date for date sorting
    const groups: { [key: string]: TransactionList[] } = {};
    allTransactions.forEach((transaction: TransactionList) => {
      const date = transaction.date!;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [data?.pages, filters.sort]);

  // Virtualization Setup
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: groupedTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const transactions = groupedTransactions[index][1];
      const headerHeight =
        filters.sort === "amount_cents" ? 0 : dayHeaderHeight;
      return headerHeight + transactions.length * transactionRowHeight;
    },
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
  }, [rowVirtualizer, dataUpdatedAt, selectedCount]);

  if (status === "error") {
    return <div>Error loading transactions</div>;
  }

  if (status === "pending") {
    return <TransactionListLoading />;
  }

  // Show empty state when no transactions
  if (!groupedTransactions.length) {
    return (
      <EmptyState
        title="No transactions found"
        description="Please try again or add a new transaction."
      />
    );
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
                {filters.sort !== "amount_cents" && <DayHeader date={date} />}
                {dateTransactions.map((transaction) => (
                  <TransactionRow
                    key={`${transaction.id}-${transaction.amount_cents}-${transaction.description ?? ""}-${transaction.tag_ids?.join(",") ?? ""}-${transaction.category_id}-${transaction.label_id}`}
                    transaction={transaction}
                    onClick={(e) => handleTransactionClick(e, transaction)}
                    selected={selected.includes(transaction.id!)}
                    selectionMode={selectedCount > 0}
                    onToggleSelect={(e) => toggleSelected(transaction.id!, e.shiftKey)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {isFetchingNextPage && (
        <div className="flex justify-center p-4">
          <RowLoading />
        </div>
      )}
      {selectedCount > 0 && (
        <BulkActions
          selectedCount={selectedCount}
          clearSelection={clearSelection}
          selectAll={selectAll}
        >
          <TooltipButton
            tooltip="Download selected as CSV"
            variant="ghost"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="size-4" />
          </TooltipButton>
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
        transactionIds={selected}
        selectedTransactions={
          data?.pages
            .flatMap((page) => page.data)
            .filter((t) => selected.includes(t.id!)) ?? []
        }
        onSuccess={() => {
          setBulkOpen(false);
          clearSelection();
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
        <RowLoading key={index} />
      ))}
    </div>
  );
};
