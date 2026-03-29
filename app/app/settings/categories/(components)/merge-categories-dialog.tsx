"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import CategoryCombobox from "@/components/shared/category-combobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useCategories } from "@/contexts/settings-context";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { mergeCategories } from "@/utils/supabase/mutations";

interface MergeCategoriesDialogProps {
  selected: string[];
  type: "income" | "expense" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function MergeCategoriesDialog({
  selected,
  type,
  open,
  onOpenChange,
  onSuccess,
}: MergeCategoriesDialogProps) {
  const [target, setTarget] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [categories] = useCategories();

  useEffect(() => {
    if (!open) {
      setTarget(null);
      setValidationError(null);
    }
  }, [open]);

  // Client-side validation
  const validateMerge = (targetValue: string) => {
    if (selected.length < 2) {
      return "Please select at least 2 categories to merge";
    }

    if (!targetValue) {
      return "Please select a target category";
    }

    // Get the selected categories
    const selectedCategories = selected
      .map((id) => categories.find((c) => c.id === id))
      .filter(Boolean);

    // Check if any category is of type "transfer"
    const transferCategories = selectedCategories.filter(
      (cat) => cat?.type === "transfer",
    );
    if (transferCategories.length > 0) {
      return "Merging transfer categories is not allowed";
    }

    // Check if target category is transfer
    const targetCategory = categories.find((c) => c.id === targetValue);
    if (targetCategory?.type === "transfer") {
      return "Cannot use a transfer category as the target";
    }

    // Validate all categories have the same type
    const categoryTypes = Array.from(
      new Set(selectedCategories.map((cat) => cat?.type)),
    );
    if (categoryTypes.length > 1) {
      return "All categories must be of the same type (income or expense)";
    }

    // Check if target is of the same type as selected categories
    if (
      targetCategory &&
      categoryTypes.length === 1 &&
      targetCategory.type !== categoryTypes[0]
    ) {
      return "Target category must be of the same type as the selected categories";
    }

    return null;
  };

  const mutation = useMutation({
    mutationFn: async (targetValue: string) => {
      if (!targetValue) return;

      // Use targetValue instead of target from closure
      const error = validateMerge(targetValue);
      if (error) {
        setValidationError(error);
        return;
      }
      setValidationError(null);

      await mergeCategories(targetValue, selected);
    },
    onSuccess: () => {
      invalidateWorkspaceQueries(queryClient);
      toast.success("Categories merged");
      onOpenChange(false);
      setTarget(null);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      if (err instanceof Error) toast.error(err.message);
      else toast.error("Failed to merge categories");
    },
  });

  const confirmMerge = () => {
    if (target) {
      mutation.mutate(target);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            You are about to merge {selected.length} categories
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will move all transactions from the selected categories to the
            target category and delete the others.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4">
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Unable to merge categories.</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
          <CategoryCombobox
            selectionType="combobox"
            type={type || undefined}
            value={target}
            onChange={setTarget}
            placeholder="Target category"
            className="w-full"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmMerge}
            disabled={!target || !!validationError || mutation.isPending}
          >
            Merge
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
