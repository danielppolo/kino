"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import DeleteBillsDialog from "./delete-bills-dialog";

import BillRow from "@/components/shared/bill-row";
import { BulkActions } from "@/components/shared/bulk-actions";
import EmptyState from "@/components/shared/empty-state";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useBills } from "@/contexts/settings-context";
import { useKeyboardListNavigation } from "@/hooks/use-keyboard-list-navigation";
import { useSelection } from "@/hooks/use-selection";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { Bill } from "@/utils/supabase/types";

interface BillsSectionProps {
  type: "recurrent" | "archive";
  isActive: boolean;
  onEdit: (bill: Bill) => void;
}

export default function BillsSection({ type, onEdit }: BillsSectionProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [allBills] = useBills();

  // Filter bills based on type
  const bills = allBills.filter((bill) => {
    if (type === "recurrent") {
      return bill.is_recurring === true;
    } else {
      return bill.is_recurring === false || bill.is_recurring === null;
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

  // Sort bills by due date
  const sortedBills = [...bills].sort((a, b) =>
    a.due_date.localeCompare(b.due_date),
  );

  const { activeId, setActiveId } = useKeyboardListNavigation({
    items: sortedBills,
    getItemId: (bill) => bill.id,
    onEnter: onEdit,
    onSpace: (bill) => toggleSelection(bill.id),
    onSelectAll: selectAll,
  });

  if (sortedBills.length === 0) {
    const emptyMessage =
      type === "recurrent"
        ? "No recurrent bills found"
        : "No archived bills found";
    const emptyDescription =
      type === "recurrent"
        ? "Add your first recurrent bill to track your payment responsibilities."
        : "Archived bills will appear here.";

    return <EmptyState title={emptyMessage} description={emptyDescription} />;
  }

  return (
    <>
      {sortedBills?.map((bill) => {
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
