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
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({
      tagId,
      categoryId,
    }: {
      tagId: string;
      categoryId: string;
    }) => {
      // First update the transaction categories
      const result = await updateTransactionCategoriesByTag(tagId, categoryId);

      // Delete the tag after updating transactions (default behavior)
      await deleteTag(tagId);

      return result;
    },
    onSuccess: (data) => {
      toast.success(
        `Successfully converted ${data.updatedCount} transaction${
          data.updatedCount === 1 ? "" : "s"
        } to the new category and deleted the tag.`,
      );
      onSuccess?.();
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["tag-transaction-counts"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      onOpenChange(false);
      setSelectedCategoryId(null);
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
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedCategoryId(null);
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
            &rdquo; and then delete the tag. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <CategoryCombobox
              value={selectedCategoryId}
              onChange={(id) => setSelectedCategoryId(id)}
              placeholder="Choose a category..."
              className="w-full"
            />
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
