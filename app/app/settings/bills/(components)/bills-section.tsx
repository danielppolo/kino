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
import { Bill } from "@/utils/supabase/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { listBills } from "@/utils/supabase/queries";
import { PAGE_SIZE } from "@/utils/constants";
import { RowLoading } from "@/components/ui/row";

interface BillsSectionProps {
  type: "future" | "past";
  isActive: boolean;
  onEdit: (bill: Bill) => void;
}

interface GroupedBills {
  date: string;
  bills: Bill[];
}

export default function BillsSection({ type, onEdit }: BillsSectionProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["bills", type],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = createClient();
      const result = await listBills(supabase, {
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

  // Flatten pages and filter by type
  const allBills = data?.pages.flatMap((page) => page.data) ?? [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bills = allBills.filter((bill) => {
    const billDate = new Date(bill.due_date);
    billDate.setHours(0, 0, 0, 0);

    if (type === "future") {
      return billDate >= today;
    } else {
      return billDate < today;
    }
  });

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

  const toggleSelect = (bill: Bill, shiftKey = false) => {
    toggleSelection(bill.id, shiftKey);
  };

  // Sort bills by due date descending
  const sortedBills = [...bills].sort((a, b) =>
    b.due_date.localeCompare(a.due_date),
  );

  // Group bills by due date
  const groupedBills: GroupedBills[] = sortedBills.reduce((acc, bill) => {
    const existing = acc.find((group) => group.date === bill.due_date);
    if (existing) {
      existing.bills.push(bill);
    } else {
      acc.push({ date: bill.due_date, bills: [bill] });
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
    const emptyMessage =
      type === "future"
        ? "No future bills found"
        : "No past bills found";
    const emptyDescription =
      type === "future"
        ? "Add your first bill to track your payment responsibilities."
        : "Past bills will appear here.";

    return <EmptyState title={emptyMessage} description={emptyDescription} />;
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
            return (
              <BillRow
                key={bill.id}
                bill={bill}
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
