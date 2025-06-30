"use client";

import { useState } from "react";
import { Combine, Plus, Trash2, SquaresUnite } from "lucide-react";

import BulkCategoryChangeDialog from "./(components)/bulk-category-change-dialog";
import DeleteTagsDialog from "./(components)/delete-tags-dialog";
import MergeTagsDialog from "./(components)/merge-tags-dialog";
import TagsSection from "./(components)/tags-section";

import { BulkActions } from "@/components/shared/bulk-actions";
import TagForm from "@/components/shared/tag-form";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Title } from "@/components/ui/typography";
import { useTags } from "@/contexts/settings-context";
import { Tag as TagType } from "@/utils/supabase/types";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useSelection } from "@/hooks/use-selection";

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

  const toggleSelect = (tag: TagType) => {
    toggleSelection(tag.id);
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
      />

      <BulkActions
        selectedCount={selectedCount}
        clearSelection={clearSelection}
        selectAll={selectAll}
      >
        <TooltipButton
          tooltip="Delete"
          size="sm"
          variant="ghost"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="size-4" />
        </TooltipButton>
        <TooltipButton
          tooltip="Merge"
          size="sm"
          variant="ghost"
          onClick={() => setMergeDialogOpen(true)}
          disabled={selectedCount < 2}
        >
          <SquaresUnite className="size-4" />
        </TooltipButton>
        {hasSelectedWithTransactions && (
          <TooltipButton
            tooltip="Merge to category"
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
