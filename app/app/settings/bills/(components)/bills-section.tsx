"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import DeleteBillsDialog from "./delete-bills-dialog";

import { BulkActions } from "@/components/shared/bulk-actions";
import EmptyState from "@/components/shared/empty-state";
import BillForm from "@/components/shared/bill-form";
import BillRow from "@/components/shared/bill-row";
import PageHeader from "@/components/shared/page-header";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useBills } from "@/contexts/settings-context";
import { useKeyboardListNavigation } from "@/hooks/use-keyboard-list-navigation";
import { useSelection } from "@/hooks/use-selection";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { Bill } from "@/utils/supabase/types";

export default function BillsSection() {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editBill, setEditBill] = useState<Bill | undefined>(undefined);
  const [bills] = useBills();

  const {
    selected,
    selectedCount,
    clearSelection,
    toggleSelection,
    selectAll,
  } = useSelection({
    getAllIds: () => bills.map((b) => b.id),
  });

  const handleAdd = () => {
    setEditBill(undefined);
    setOpen(true);
  };

  const handleEdit = (bill: Bill) => {
    setEditBill(bill);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditBill(undefined);
  };

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
    onEnter: handleEdit,
    onSpace: (bill) => toggleSelection(bill.id),
    onSelectAll: selectAll,
  });

  if (sortedBills.length === 0) {
    return (
      <>
        <PageHeader className="justify-end">
          <TooltipButton
            size="sm"
            variant="outline"
            tooltip="Add bill"
            onClick={handleAdd}
          >
            <Plus className="size-4" />
          </TooltipButton>
        </PageHeader>
        <EmptyState
          title="No bills found"
          description="Add your first bill to track your payment responsibilities."
        />
        <BillForm open={open} onOpenChange={setOpen} onSuccess={handleClose} />
      </>
    );
  }

  return (
    <>
      <PageHeader className="justify-end">
        <TooltipButton
          size="sm"
          variant="outline"
          tooltip="Add bill"
          onClick={handleAdd}
        >
          <Plus className="size-4" />
        </TooltipButton>
      </PageHeader>

      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        {sortedBills?.map((bill) => {
          const isSelected = selected.includes(bill.id);
          return (
            <BillRow
              key={bill.id}
              bill={bill}
              onClick={() => {
                setActiveId(bill.id);
                handleEdit(bill);
              }}
              selected={isSelected}
              selectionMode={selectedCount > 0}
              onToggleSelect={(e) => toggleSelect(bill, e.shiftKey)}
              active={bill.id === activeId}
            />
          );
        })}
      </div>

      <BillForm
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
        bill={editBill}
      />

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

