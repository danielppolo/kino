"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import CategoryCombobox from "@/components/shared/category-combobox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import {
  deleteTag,
  updateTransactionCategoriesByTag,
} from "@/utils/supabase/mutations";
import { Tag } from "@/utils/supabase/types";

interface BulkCategoryChangeDialogProps {
  tag?: Tag;
  transactionCounts: Map<string, number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function BulkCategoryChangeDialog({
  tag,
  transactionCounts,
  open,
  onSuccess,
  onOpenChange,
}: BulkCategoryChangeDialogProps) {
  const transactionCount = tag?.id ? transactionCounts.get(tag.id) : 0;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [deleteTagAfterUpdate, setDeleteTagAfterUpdate] = useState(true);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({
      tagId,
      categoryId,
      shouldDeleteTag,
    }: {
      tagId: string;
      categoryId: string;
      shouldDeleteTag: boolean;
    }) => {
      // First update the transaction categories
      const result = await updateTransactionCategoriesByTag(tagId, categoryId);

      // Delete the tag only if the checkbox is checked
      if (shouldDeleteTag) {
        await deleteTag(tagId);
      }

      return result;
    },
    onSuccess: (data, variables) => {
      const actionText =
        deleteTagAfterUpdate && variables.shouldDeleteTag
          ? "and deleted the tag"
          : "and kept the tag";
      toast.success(
        `Successfully converted ${data.updatedCount} transaction${
          data.updatedCount === 1 ? "" : "s"
        } to the new category ${actionText}.`,
      );
      onSuccess?.();
      void invalidateWorkspaceQueries(queryClient);
      onOpenChange(false);
      setSelectedCategoryId(null);
      setDeleteTagAfterUpdate(true);
    },
    onError: (error) => {
      toast.error(`Failed to convert transactions: ${error.message}`);
    },
  });

  const handleConfirm = () => {
    if (!selectedCategoryId || !tag?.id) {
      toast.error("Please select a category");
      return;
    }

    updateMutation.mutate({
      tagId: tag.id,
      categoryId: selectedCategoryId,
      shouldDeleteTag: deleteTagAfterUpdate,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedCategoryId(null);
      setDeleteTagAfterUpdate(true);
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Merge to Category</AlertDialogTitle>
          <AlertDialogDescription>
            This will change the category for all {transactionCount} transaction
            {transactionCount === 1 ? "" : "s"} tagged with &ldquo;{tag?.title}
            &rdquo;. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <CategoryCombobox
              selectionType="checkbox"
              value={selectedCategoryId}
              onChange={(id) => setSelectedCategoryId(id)}
              placeholder="Choose a category..."
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="delete-tag"
              checked={deleteTagAfterUpdate}
              onCheckedChange={(checked) =>
                setDeleteTagAfterUpdate(checked as boolean)
              }
            />
            <Label htmlFor="delete-tag" className="text-sm">
              Delete tag after updating transactions
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!selectedCategoryId || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Merging..." : "Merge to Category"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
