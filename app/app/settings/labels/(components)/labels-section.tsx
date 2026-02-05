"use client";

import { useEffect, useState } from "react";
import { Merge, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import DeleteLabelsDialog from "./delete-labels-dialog";
import MergeLabelsDialog from "./merge-labels-dialog";

import { BulkActions } from "@/components/shared/bulk-actions";
import EmptyState from "@/components/shared/empty-state";
import LabelForm from "@/components/shared/label-form";
import LabelRow from "@/components/shared/label-row";
import PageHeader from "@/components/shared/page-header";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useLabels } from "@/contexts/settings-context";
import { useKeyboardListNavigation } from "@/hooks/use-keyboard-list-navigation";
import { useSelection } from "@/hooks/use-selection";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { COLORS } from "@/utils/constants";
import { Database } from "@/utils/supabase/database.types";

export default function LabelSection() {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [editLabel, setEditLabel] = useState<
    Database["public"]["Tables"]["labels"]["Row"] | undefined
  >(undefined);
  const [labels] = useLabels();
  const searchParams = useSearchParams();

  const {
    selected,
    selectedCount,
    clearSelection,
    toggleSelection,
    selectAll,
  } = useSelection({
    getAllIds: () => labels.map((l) => l.id),
  });

  const handleAdd = () => {
    setEditLabel(undefined);
    setOpen(true);
  };

  const handleEdit = (label: Database["public"]["Tables"]["labels"]["Row"]) => {
    setEditLabel(label);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditLabel(undefined);
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    clearSelection();
  };

  const handleMergeSuccess = () => {
    setMergeDialogOpen(false);
    clearSelection();
  };

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setEditLabel(undefined);
    setOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canUseGlobalShortcuts()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (selectedCount === 0) return;

      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        setDeleteDialogOpen(true);
      }

      if (event.key.toLowerCase() === "m" && selectedCount >= 2) {
        event.preventDefault();
        setMergeDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCount]);

  const toggleSelect = (
    label: Database["public"]["Tables"]["labels"]["Row"],
    shiftKey = false,
  ) => {
    toggleSelection(label.id, shiftKey);
  };

  const sortedLabels = [...labels].sort((a, b) => {
    const aIndex = COLORS.indexOf(a.color);
    const bIndex = COLORS.indexOf(b.color);

    // If both colors are found in the COLORS array, sort by their index
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // If only one color is found, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // If neither color is found, sort alphabetically by name as fallback
    return a.name.localeCompare(b.name);
  });

  const { activeId, setActiveId } = useKeyboardListNavigation({
    items: sortedLabels,
    getItemId: (label) => label.id,
    onEnter: handleEdit,
    onSpace: (label) => toggleSelection(label.id),
    onSelectAll: selectAll,
  });

  if (sortedLabels.length === 0) {
    return (
      <EmptyState
        title="No labels found"
        description="Please try again or add a new label."
      />
    );
  }

  return (
    <>
      <PageHeader className="justify-end">
        <TooltipButton
          size="sm"
          variant="outline"
          tooltip="Add label"
          onClick={handleAdd}
        >
          <Plus className="size-4" />
        </TooltipButton>
      </PageHeader>

      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        {sortedLabels?.map((label) => {
          const isSelected = selected.includes(label.id);
          return (
            <LabelRow
              key={label.id}
              label={label}
              onClick={() => {
                setActiveId(label.id);
                handleEdit(label);
              }}
              selected={isSelected}
              selectionMode={selectedCount > 0}
              onToggleSelect={(e) => toggleSelect(label, e.shiftKey)}
              active={label.id === activeId}
            />
          );
        })}
      </div>

      <LabelForm
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
        label={editLabel}
      />

      <DeleteLabelsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selected={selected}
        onSuccess={handleDeleteSuccess}
      />

      <MergeLabelsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        selected={selected}
        onSuccess={handleMergeSuccess}
      />

      <BulkActions
        selectedCount={selectedCount}
        clearSelection={clearSelection}
        selectAll={selectAll}
      >
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Merge selected labels (M)"
          onClick={() => setMergeDialogOpen(true)}
          disabled={selectedCount < 2}
        >
          <Merge className="size-4" />
        </TooltipButton>
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Delete selected labels (D)"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={selectedCount === 0}
        >
          <Trash2 className="size-4" />
        </TooltipButton>
      </BulkActions>
    </>
  );
}
