"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import LabelCombobox from "@/components/shared/label-combobox";
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
import { mergeLabels } from "@/utils/supabase/mutations";

interface MergeLabelsDialogProps {
  selected: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function MergeLabelsDialog({
  selected,
  open,
  onOpenChange,
  onSuccess,
}: MergeLabelsDialogProps) {
  const [target, setTarget] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      setTarget(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async (targetValue: string) => {
      if (!targetValue) return;
      await mergeLabels(targetValue, selected);
    },
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
      toast.success("Labels merged");
      onOpenChange(false);
      setTarget(null);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      if (err instanceof Error) toast.error(err.message);
      else toast.error("Failed to merge labels");
    },
  });

  const confirmMerge = () => {
    if (target) {
      mutation.mutate(target);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="overflow-visible">
        <AlertDialogHeader>
          <AlertDialogTitle>
            You are about to merge {selected.length} labels
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will move all transactions from the selected labels to the
            target label and delete the others.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="relative w-full">
          <LabelCombobox
            value={target}
            onChange={(value) => {
              setTarget(value);
            }}
            placeholder="Target label"
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
