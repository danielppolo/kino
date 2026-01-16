"use client";

import { useEffect, useState } from "react";
import { Combine, Plus, Trash2, SquaresUnite } from "lucide-react";

import BulkCategoryChangeDialog from "./(components)/bulk-category-change-dialog";
import DeleteTagsDialog from "./(components)/delete-tags-dialog";
import MergeTagsDialog from "./(components)/merge-tags-dialog";
import TagsSection from "./(components)/tags-section";

import { BulkActions } from "@/components/shared/bulk-actions";
import PageHeader from "@/components/shared/page-header";
import TagForm from "@/components/shared/tag-form";
import { Button } from "@/components/ui/button";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useTags } from "@/contexts/settings-context";
import { useSelection } from "@/hooks/use-selection";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { Tag as TagType } from "@/utils/supabase/types";

export default function Page() {
  const [tags] = useTags();
  const [transactionCounts, setTransactionCounts] = useState<
    Map<string, number>
  >(new Map());
  const [open, setOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);

  const {
    selected,
    selectedCount,
    clearSelection,
    toggleSelection,
    selectAll,
  } = useSelection({
    getAllIds: () => tags.map((t) => t.id),
  });

  const toggleSelect = (tag: TagType, shiftKey = false) => {
    toggleSelection(tag.id, shiftKey);
  };

  const handleAdd = () => {
    setSelectedTag(null);
    setOpen(true);
  };

  const handleEdit = (tag: TagType) => {
    setSelectedTag(tag);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedTag(null);
  };

  const handleMergeSuccess = () => {
    setMergeDialogOpen(false);
    clearSelection();
  };

  const handleConvertSuccess = () => {
    setBulkCategoryDialogOpen(false);
    clearSelection();
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    clearSelection();
  };

  const handleTransactionCountsLoaded = (counts: Map<string, number>) => {
    setTransactionCounts(counts);
  };

  const selectedTags = tags.filter((tag) => selected.includes(tag.id));
  const hasSelectedWithTransactions = selectedTags.some(
    (tag) => (transactionCounts.get(tag.id) || 0) > 0,
  );

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

      if (
        event.key.toLowerCase() === "c" &&
        hasSelectedWithTransactions &&
        selectedTags.length === 1
      ) {
        event.preventDefault();
        setBulkCategoryDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSelectedWithTransactions, selectedCount, selectedTags.length]);

  return (
    <div>
      <PageHeader className="justify-end">
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="size-4" />
        </Button>
      </PageHeader>

      <TagsSection
        selected={selected}
        onToggle={toggleSelect}
        onEdit={handleEdit}
        onTransactionCountsLoaded={handleTransactionCountsLoaded}
        selectAll={selectAll}
      />

      <BulkActions
        selectedCount={selectedCount}
        clearSelection={clearSelection}
        selectAll={selectAll}
      >
        <TooltipButton
          tooltip="Delete (D)"
          size="sm"
          variant="ghost"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="size-4" />
        </TooltipButton>
        <TooltipButton
          tooltip="Merge (M)"
          size="sm"
          variant="ghost"
          onClick={() => setMergeDialogOpen(true)}
          disabled={selectedCount < 2}
        >
          <SquaresUnite className="size-4" />
        </TooltipButton>
        {hasSelectedWithTransactions && (
          <TooltipButton
            tooltip="Merge to category (C)"
            size="sm"
            variant="ghost"
            disabled={selectedTags.length > 1}
            onClick={() => setBulkCategoryDialogOpen(true)}
          >
            <Combine className="size-4" />
          </TooltipButton>
        )}
      </BulkActions>

      <TagForm
        open={open}
        onOpenChange={handleClose}
        onSuccess={handleClose}
        tag={selectedTag ?? undefined}
      />
      <MergeTagsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        selected={selected}
        onSuccess={handleMergeSuccess}
      />
      <DeleteTagsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selected={selected}
        onSuccess={handleDeleteSuccess}
      />
      <BulkCategoryChangeDialog
        tag={selectedTags[0]}
        transactionCounts={transactionCounts}
        open={bulkCategoryDialogOpen}
        onOpenChange={setBulkCategoryDialogOpen}
        onSuccess={handleConvertSuccess}
      />
    </div>
  );
}
