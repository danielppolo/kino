"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      setTarget(null);
      setConfirmOpen(false);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return;
      await mergeCategories(target, selected);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
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

  const handleMerge = () => {
    setConfirmOpen(true);
  };

  const confirmMerge = () => {
    setConfirmOpen(false);
    mutation.mutate();
  };

  return (
    <>
      <DrawerDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Merge Categories"
      >
        <div className="flex flex-col gap-4">
          <CategoryCombobox
            type={type || undefined}
            value={target}
            onChange={setTarget}
            placeholder="Target category"
          />
          <Button size="sm" onClick={handleMerge} disabled={!target}>
            Merge
          </Button>
        </div>
      </DrawerDialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge categories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move all transactions from the selected categories to
              the target category and delete the others.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMerge}
              disabled={mutation.isPending}
            >
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
