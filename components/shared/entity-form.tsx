"use client";

import { useEffect } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { Trash } from "lucide-react";
import { toast } from "sonner";

import { Switch } from "../ui/switch";

import { Button } from "@/components/ui/button";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import { Form } from "@/components/ui/form";

interface EntityFormProps<T extends FieldValues> {
  title: string;
  entity?: T;
  open?: boolean;
  addAnother?: boolean;
  setAddAnother?: (addAnother: boolean) => void;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  defaultValues: T;
  onSubmit: (values: T) => Promise<{ error?: string }>;
  onDelete?: (entity: T) => Promise<{ error?: string }>;
  children: React.ReactNode;
}

export function EntityForm<T extends FieldValues>({
  title,
  entity,
  open,
  addAnother,
  setAddAnother,
  onOpenChange,
  onSuccess,
  defaultValues,
  onSubmit,
  onDelete,
  children,
}: EntityFormProps<T>) {
  const isEdit = !!entity;
  const form = useForm<T>({
    defaultValues: entity || defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(entity || defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, open]);

  const handleSubmit = async (values: T) => {
    const { error } = await onSubmit(values);
    if (error) {
      return toast.error(error);
    }
    toast.success(isEdit ? "Updated successfully!" : "Created successfully!");
    onSuccess?.();
  };

  const handleDelete = async () => {
    if (!entity || !onDelete) return;

    const { error } = await onDelete(entity);
    if (error) {
      return toast.error(error);
    }
    toast.success("Deleted successfully!");
    onSuccess?.();
  };

  return (
    <DrawerDialog
      title={isEdit ? `Edit ${title}` : `Add ${title}`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          {children}
          <div className="flex justify-end gap-2">
            {!!isEdit && addAnother && (
              <div className="flex items-center gap-2">
                <Switch
                  id="add-another"
                  checked={addAnother}
                  onCheckedChange={setAddAnother}
                />
                <label htmlFor="add-another" className="text-sm">
                  Create more
                </label>
              </div>
            )}
            {isEdit && onDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
              >
                <Trash className="size-4" />
              </Button>
            )}
            <Button type="submit" size="sm">
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Form>
    </DrawerDialog>
  );
}
