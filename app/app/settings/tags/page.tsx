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

export default function Page() {
  const [tags] = useTags();
  const [selected, setSelected] = useState<string[]>([]);
  const [transactionCounts, setTransactionCounts] = useState<
    Map<string, number>
  >(new Map());
  const [open, setOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);

  const toggleSelect = (tag: TagType) => {
    setSelected((prev) =>
      prev.includes(tag.id)
        ? prev.filter((id) => id !== tag.id)
        : [...prev, tag.id],
    );
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
    setSelected([]);
  };

  const handleConvertSuccess = () => {
    setBulkCategoryDialogOpen(false);
    setSelected([]);
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    setSelected([]);
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
      <PageHeader className="bg-background sticky top-0 z-10 py-6">
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
        selectedCount={selected.length}
        onClear={() => setSelected([])}
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
          disabled={selected.length < 2}
        >
          <Combine className="size-4" />
        </TooltipButton>
        {hasSelectedWithTransactions && (
          <TooltipButton
            tooltip="Convert to category"
            size="sm"
            variant="ghost"
            disabled={selectedTags.length > 1}
            onClick={() => setBulkCategoryDialogOpen(true)}
          >
            <SquaresUnite className="size-4" />
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
