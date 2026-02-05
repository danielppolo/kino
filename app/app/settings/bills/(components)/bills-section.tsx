"use client";

import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";

import DeleteBillsDialog from "./delete-bills-dialog";

import BillRow from "@/components/shared/bill-row";
import { BulkActions } from "@/components/shared/bulk-actions";
import EmptyState from "@/components/shared/empty-state";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { Text } from "@/components/ui/typography";
import { useKeyboardListNavigation } from "@/hooks/use-keyboard-list-navigation";
import { useSelection } from "@/hooks/use-selection";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { listRecurrentBills } from "@/utils/supabase/queries";
import { PAGE_SIZE } from "@/utils/constants";
import { RowLoading } from "@/components/ui/row";
import type { Database } from "@/utils/supabase/database.types";

type RecurrentBill = Database["public"]["Tables"]["recurrent_bills"]["Row"];

interface BillsSectionProps {
  onEdit: (bill: RecurrentBill) => void;
}

interface GroupedBills {
  date: string;
  bills: RecurrentBill[];
}

export default function BillsSection({ onEdit }: BillsSectionProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["recurrent-bills"],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = createClient();
      const result = await listRecurrentBills(supabase, {
        page: pageParam as number,
        pageSize: PAGE_SIZE,
      });
      if (result.error) throw result.error;
      return {
        data: result.data ?? [],
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

  // Flatten pages - no filtering needed, show all recurrent bills
  const bills = data?.pages.flatMap((page) => page.data) ?? [];

  const {
    selected,
    selectedCount,
    clearSelection,
    toggleSelection,
    selectAll,
  } = useSelection({
    getAllIds: () => bills.map((b) => b.id),
  });

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    clearSelection();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canUseGlobalShortcuts()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (selectedCount === 0) return;

      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        setDeleteDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCount]);

  const toggleSelect = (bill: RecurrentBill, shiftKey = false) => {
    toggleSelection(bill.id, shiftKey);
  };

  // Sort bills by next_due_date descending
  const sortedBills = [...bills].sort((a, b) => {
    const dateA = a.next_due_date || a.start_date;
    const dateB = b.next_due_date || b.start_date;
    return dateB.localeCompare(dateA);
  });

  // Group bills by next_due_date (or start_date if next_due_date is null)
  const groupedBills: GroupedBills[] = sortedBills.reduce((acc, bill) => {
    const date = bill.next_due_date || bill.start_date;
    const existing = acc.find((group) => group.date === date);
    if (existing) {
      existing.bills.push(bill);
    } else {
      acc.push({ date, bills: [bill] });
    }
    return acc;
  }, [] as GroupedBills[]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { activeId, setActiveId } = useKeyboardListNavigation({
    items: sortedBills,
    getItemId: (bill) => bill.id,
    onEnter: onEdit,
    onSpace: (bill) => toggleSelection(bill.id),
    onSelectAll: selectAll,
  });

  if (status === "pending") {
    return (
      <div className="flex justify-center py-8">
        <RowLoading />
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Error loading bills"
        description="Please try again or contact support."
      />
    );
  }

  if (sortedBills.length === 0) {
    return (
      <EmptyState
        title="No recurrent bills found"
        description="Add your first recurrent bill to track your payment responsibilities."
      />
    );
  }

  return (
    <>
      {groupedBills.map((group) => (
        <div key={group.date}>
          <div className="bg-muted/50 sticky top-0 z-10 px-4 py-2">
            <Text small muted className="font-medium">
              {format(parseISO(group.date), "MMMM d, yyyy")}
            </Text>
          </div>
          {group.bills.map((bill) => {
            const isSelected = selected.includes(bill.id);
            // Convert RecurrentBill to Bill-like format for BillRow
            const billForRow = {
              ...bill,
              due_date: bill.next_due_date || bill.start_date,
              is_recurring: true,
              interval_type: bill.interval_type,
            } as any;
            return (
              <BillRow
                key={bill.id}
                bill={billForRow}
                onClick={() => {
                  setActiveId(bill.id);
                  onEdit(bill);
                }}
                selected={isSelected}
                selectionMode={selectedCount > 0}
                onToggleSelect={(e) => toggleSelect(bill, e.shiftKey)}
                active={bill.id === activeId}
              />
            );
          })}
        </div>
      ))}

      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isFetchingNextPage ? (
            <RowLoading />
          ) : (
            <Text small muted>
              Load more...
            </Text>
          )}
        </div>
      )}

      <DeleteBillsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selected={selected}
        onSuccess={handleDeleteSuccess}
      />

      <BulkActions
        selectedCount={selectedCount}
        clearSelection={clearSelection}
        selectAll={selectAll}
      >
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Delete selected bills (D)"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={selectedCount === 0}
        >
          <Trash2 className="size-4" />
        </TooltipButton>
      </BulkActions>
    </>
  );
}
