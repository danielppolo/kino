"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

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
import { deleteViews } from "@/utils/supabase/mutations";

interface DeleteViewsDialogProps {
  selected: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function DeleteViewsDialog({
  selected,
  open,
  onOpenChange,
  onSuccess,
}: DeleteViewsDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await deleteViews(selected);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["views"] });
      toast.success(`${selected.length} views deleted`);
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: unknown) => {
      if (err instanceof Error) toast.error(err.message);
      else toast.error("Failed to delete views");
    },
  });

  const confirmDelete = () => {
    mutation.mutate();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="text-destructive size-5" />
            Delete {selected.length} views
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete {selected.length} view{selected.length === 1 ? "" : "s"}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={confirmDelete}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
