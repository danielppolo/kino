"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import CategoryMultiSelect from "@/components/shared/category-multi-select";
import CategoryCombobox from "@/components/shared/category-combobox";
import { Button } from "@/components/ui/button";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
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
import { mergeCategories } from "@/utils/supabase/mutations";

export default function MergeCategoriesDialog() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [categories] = useCategories();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return;
      await mergeCategories(target, selected);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Categories merged");
      setOpen(false);
      setSelected([]);
      setTarget(null);
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
        onOpenChange={setOpen}
        title="Merge Categories"
        trigger={<Button size="sm" variant="outline">Merge Categories</Button>}
      >
        <div className="flex flex-col gap-4">
          <CategoryMultiSelect
            options={categories}
            value={selected}
            onChange={setSelected}
            placeholder="Select categories"
          />
          <CategoryCombobox
            value={target}
            onChange={setTarget}
            placeholder="Target category"
          />
          <Button
            size="sm"
            onClick={handleMerge}
            disabled={selected.length < 2 || !target}
          >
            Merge
          </Button>
        </div>
      </DrawerDialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge categories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move all transactions from the selected categories to the target category and delete the others.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMerge} disabled={mutation.isLoading}>
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
