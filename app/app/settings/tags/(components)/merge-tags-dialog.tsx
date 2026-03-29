"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import TagCombobox from "@/components/shared/tag-combobox";
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
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { mergeTags } from "@/utils/supabase/mutations";

interface MergeTagsDialogProps {
  selected: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function MergeTagsDialog({
  selected,
  open,
  onOpenChange,
  onSuccess,
}: MergeTagsDialogProps) {
  const [target, setTarget] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return;
      await mergeTags(target, selected);
    },
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
      toast.success("Tags merged");
      onOpenChange(false);
      setTarget(null);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      if (err instanceof Error) toast.error(err.message);
      else toast.error("Failed to merge tags");
    },
  });

  const confirmMerge = () => {
    mutation.mutate();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="overflow-visible">
        <AlertDialogHeader>
          <AlertDialogTitle>
            You are about to merge {selected.length} tags
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will move all transactions from the selected tags to the target
            tag and delete the others.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="relative w-full">
          <TagCombobox
            value={target}
            onChange={(value) => {
              setTarget(value);
            }}
            placeholder="Target tag"
            className="relative w-full"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmMerge}
            disabled={!target || mutation.isPending}
          >
            Merge
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
