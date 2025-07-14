"use client";

import { useEffect } from "react";
import { DefaultValues, FieldValues, useForm } from "react-hook-form";
import { Trash } from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "../submit-button";
import { Switch } from "../ui/switch";
import TemplateSelect from "./template-select";

import { Button } from "@/components/ui/button";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import { Form } from "@/components/ui/form";

interface EntityFormProps<T extends FieldValues> {
  title: string;
  entity?: T;
  open?: boolean;
  addAnother?: boolean;
  type?: "expense" | "income";
  setAddAnother?: (addAnother: boolean) => void;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  defaultValues: DefaultValues<T>;
  onSubmit: (
    values: T,
  ) => Promise<{ error?: string; resetValues?: T; setFocus?: string }>;
  onDelete?: (entity: T) => Promise<{ error?: string }>;
  children: React.ReactNode;
  isLoading?: boolean;
  customTitle?: string;
  submitLabel?: string;
}

export function EntityForm<T extends FieldValues>({
  title,
  entity,
  open,
  addAnother,
  type,
  setAddAnother,
  onOpenChange,
  onSuccess,
  defaultValues,
  onSubmit,
  onDelete,
  children,
  isLoading,
  customTitle,
  submitLabel,
  setFocus,
}: EntityFormProps<T>) {
  const isEdit = !!entity;
  const form = useForm<T>({
    defaultValues: (entity || defaultValues) as DefaultValues<T>,
  });

  useEffect(() => {
    if (open) {
      form.reset(entity || defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, open]);

  const handleSubmit = async (values: T) => {
    const { error, resetValues } = await onSubmit(values);
    if (error) {
      return toast.error(error);
    }

    toast.success(isEdit ? "Updated successfully!" : "Created successfully!");
    if (addAnother && resetValues) {
      form.reset(resetValues);
      if (setFocus) form.setFocus(setFocus);
      return;
    }
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
      title={customTitle || isEdit ? `Edit ${title}` : `Add ${title}`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="relative flex flex-col gap-4"
        >
          {children}
          <div className="flex justify-between gap-4">
            <div className="flex justify-end gap-4">
              {type && <TemplateSelect type={type} />}
            </div>
            <div className="flex justify-end gap-4">
              {!isEdit && (
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
                  disabled={isLoading}
                >
                  <Trash className="size-4" />
                </Button>
              )}
              <SubmitButton
                type="submit"
                size="sm"
                disabled={isLoading}
                isLoading={isLoading}
              >
                {submitLabel || (isEdit ? "Update" : "Create")}
              </SubmitButton>
            </div>
          </div>
        </form>
      </Form>
    </DrawerDialog>
  );
}
