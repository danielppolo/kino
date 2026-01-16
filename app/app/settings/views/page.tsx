"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import DeleteViewsDialog from "./(components)/delete-views-dialog";
import ViewsSection from "./(components)/views-section";

import { BulkActions } from "@/components/shared/bulk-actions";
import PageHeader from "@/components/shared/page-header";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useViews } from "@/contexts/settings-context";
import { useSelection } from "@/hooks/use-selection";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { View } from "@/utils/supabase/types";

export default function Page() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [views] = useViews();
  const {
    selected,
    selectedCount,
    clearSelection,
    toggleSelection,
    selectAll,
  } = useSelection({
    getAllIds: () => views.map((v) => v.id),
  });

  const toggleSelect = (view: View, shiftKey = false) => {
    toggleSelection(view.id, shiftKey);
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

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-4">
          {/* Header content can be added here if needed */}
        </div>
        <div className="flex gap-2">
          {/* Add button can be added here if needed */}
        </div>
      </PageHeader>

      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        <ViewsSection
          selected={selected}
          onToggle={toggleSelect}
          selectAll={selectAll}
        />
      </div>

      <DeleteViewsDialog
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
          tooltip="Delete selected views (D)"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={selectedCount === 0}
        >
          <Trash2 className="size-4" />
        </TooltipButton>
      </BulkActions>
    </>
  );
}
