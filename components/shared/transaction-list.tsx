"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { RowLoading } from "../ui/row";
import { TooltipButton } from "../ui/tooltip-button";
import { BulkActions } from "./bulk-actions";
import BulkTransactionEditForm from "./bulk-transaction-edit-form";
import EmptyState from "./empty-state";
import RowGroupHeader, { RowGroupHeaderLoading } from "./row-group-header";
import TransactionRow from "./transaction-row";

import { useWallets } from "@/contexts/settings-context";
import { useTransactionForm } from "@/contexts/transaction-form-context";
import useFilters from "@/hooks/use-filters";
import { useSelection } from "@/hooks/use-selection";
import { PAGE_SIZE } from "@/utils/constants";
import { convertTransactionsToCSV, downloadCSV } from "@/utils/csv-export";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { createClient } from "@/utils/supabase/client";
import { deleteTransactions } from "@/utils/supabase/mutations";
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
  const { open: formOpen, openForm } = useTransactionForm();
  const [wallets] = useWallets();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const queryClient = useQueryClient();

  // Get wallet IDs for workspace scoping
  const workspaceWalletIds = wallets.map((w) => w.id);

  const {
    data,
    dataUpdatedAt,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery<TransactionPage, Error, InfiniteTransactionData>({
    queryKey: ["transactions", filters, workspaceWalletIds],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = createClient();
      const result = await listTransactions(supabase, {
        ...filters,
        page: pageParam as number,
        pageSize: PAGE_SIZE,
        workspaceWalletIds,
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
    staleTime: 1000 * 15,
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

  const deleteMutation = useMutation({
    mutationFn: async (transactionIds: string[]) => {
      await deleteTransactions(transactionIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-owed-amounts"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast.success(
        `${selected.length} transaction${selected.length > 1 ? "s" : ""} deleted`,
      );
      clearSelection();
      setDeleteConfirmOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete transactions: ${error.message}`);
    },
  });

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(selected);
  };

  const toggleSelected = (id: string, shiftKey = false) => {
    toggleSelection(id, shiftKey);
  };

  const handleTransactionClick = (
    event: React.MouseEvent,
    transaction: TransactionList,
  ) => {
    if (selectedCount > 0) {
      toggleSelection(transaction.id!, event.shiftKey);
      return;
    }
    openForm({
      type: transaction.type!,
      walletId: transaction.wallet_id!,
      initialData: transaction as unknown as Transaction,
    });
  };

  const handleDownload = () => {
    const selectedTransactions =
      data?.pages
        .flatMap((page) => page.data)
        .filter((t) => selected.includes(t.id!)) ?? [];

    if (selectedTransactions.length === 0) return;

    const csvContent = convertTransactionsToCSV(selectedTransactions);
    const filename = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(csvContent, filename);
  };

  // Group transactions by date or handle flat list for amount sorting
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
  const groupedTransactions =
    filters.sort === "amount_cents"
      ? [["", allTransactions] as [string, TransactionList[]]]
      : (() => {
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
        })();

  const flatTransactions = groupedTransactions.flatMap(
    ([, transactions]) => transactions,
  );

  const transactionIndexById = new Map(
    flatTransactions.map((transaction, index) => [transaction.id!, index]),
  );

  const transactionPositions: { id: string; top: number }[] = [];
  let offset = 0;
  groupedTransactions.forEach(([, transactions]) => {
    const headerHeight = filters.sort === "amount_cents" ? 0 : dayHeaderHeight;
    const transactionStart = offset + headerHeight;
    transactions.forEach((transaction, index) => {
      transactionPositions.push({
        id: transaction.id!,
        top: transactionStart + index * transactionRowHeight,
      });
    });
    offset += headerHeight + transactions.length * transactionRowHeight;
  });

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

  const scrollToTransactionIndex = (index: number) => {
    const container = parentRef.current;
    if (!container) return;
    const target = transactionPositions[index];
    if (!target) return;
    const targetTop = target.top;
    const targetBottom = targetTop + transactionRowHeight;
    if (targetTop < container.scrollTop) {
      container.scrollTop = targetTop;
      return;
    }
    if (targetBottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = targetBottom - container.clientHeight;
    }
  };

  useEffect(() => {
    if (!flatTransactions.length) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= flatTransactions.length) {
        return flatTransactions.length - 1;
      }
      return prev;
    });
  }, [flatTransactions.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canUseGlobalShortcuts({ formOpen })) return;
      if (!flatTransactions.length) return;

      if (event.metaKey && !event.ctrlKey && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === "a") {
          event.preventDefault();
          selectAll();
        }
        if (selectedCount > 0 && key === "e") {
          event.preventDefault();
          setBulkOpen(true);
        }
        if (selectedCount > 0 && key === "d") {
          event.preventDefault();
          handleDownload();
        }
        return;
      }

      // Handle Delete or Backspace with Command key for bulk delete
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        selectedCount > 0
      ) {
        event.preventDefault();
        handleDeleteClick();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => {
          const nextIndex =
            event.key === "ArrowDown"
              ? Math.min(prev + 1, flatTransactions.length - 1)
              : Math.max(prev - 1, 0);
          scrollToTransactionIndex(nextIndex);
          return nextIndex;
        });
        return;
      }

      if (event.key === "Enter") {
        const activeTransaction = flatTransactions[activeIndex];
        if (!activeTransaction) return;
        event.preventDefault();
        openForm({
          type: activeTransaction.type!,
          walletId: activeTransaction.wallet_id!,
          initialData: activeTransaction as unknown as Transaction,
        });
        return;
      }

      if (event.key === " " || event.code === "Space") {
        const activeTransaction = flatTransactions[activeIndex];
        if (!activeTransaction) return;
        event.preventDefault();
        toggleSelection(activeTransaction.id!);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeIndex,
    flatTransactions,
    formOpen,
    handleDeleteClick,
    handleDownload,
    openForm,
    scrollToTransactionIndex,
    selectAll,
    selectedCount,
    toggleSelection,
  ]);

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
                {filters.sort !== "amount_cents" && (
                  <RowGroupHeader
                    title={format(new Date(`${date}T00:00:00`), "PP")}
                  />
                )}
                {dateTransactions.map((transaction) => {
                  const transactionIndex = transactionIndexById.get(
                    transaction.id!,
                  );
                  return (
                    <TransactionRow
                      key={`${transaction.id}-${transaction.amount_cents}-${transaction.description ?? ""}-${transaction.tag_ids?.join(",") ?? ""}-${transaction.category_id}-${transaction.label_id}`}
                      transaction={transaction}
                      onClick={(e) => {
                        if (typeof transactionIndex === "number") {
                          setActiveIndex(transactionIndex);
                        }
                        handleTransactionClick(e, transaction);
                      }}
                      selected={selected.includes(transaction.id!)}
                      selectionMode={selectedCount > 0}
                      active={transactionIndex === activeIndex}
                      onToggleSelect={(e) =>
                        toggleSelected(transaction.id!, e.shiftKey)
                      }
                    />
                  );
                })}
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
            tooltip="Download selected as CSV (⌘D)"
            variant="ghost"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="size-4" />
          </TooltipButton>
          <TooltipButton
            variant="ghost"
            size="sm"
            tooltip="Edit selected transactions (⌘E)"
            onClick={() => setBulkOpen(true)}
          >
            <Pencil className="size-4" />
          </TooltipButton>
          <TooltipButton
            variant="ghost"
            size="sm"
            tooltip="Delete selected transactions (⌘⌫)"
            onClick={handleDeleteClick}
            disabled={deleteMutation.isPending}
            loading={deleteMutation.isPending}
          >
            <Trash2 className="size-4" />
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
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="text-destructive size-5" />
              Delete {selectedCount} transaction{selectedCount === 1 ? "" : "s"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              {selectedCount} transaction{selectedCount === 1 ? "" : "s"} from
              your wallet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const TransactionListLoading = () => {
  return (
    <div
      style={{ height: "calc(100vh - 44px - 44px)", overflow: "auto" }}
      className="relative w-full divide-y overflow-hidden"
    >
      <RowGroupHeaderLoading />
      {Array.from({ length: 20 }).map((_, index) => (
        <RowLoading key={index} />
      ))}
    </div>
  );
};
