"use client";

import { useEffect } from "react";
import { DefaultValues, FieldValues, Path, useForm } from "react-hook-form";
import { Repeat2, Trash } from "lucide-react";
import { toast } from "sonner";

import { SubmitButton } from "../submit-button";
import { Switch } from "../ui/switch";
import TemplateSelect from "./template-select";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  isDeleting?: boolean;
  setFocus?: Path<T>;
  onRepeat?: (
    values: T,
  ) => Promise<{ error?: string; resetValues?: T; setFocus?: string }>;
  isRepeating?: boolean;
  appearance?: "default" | "transaction";
  footerFields?: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
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
  isDeleting,
  onRepeat,
  isRepeating,
  appearance = "default",
  footerFields,
  initialFocusRef,
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
    if (addAnother) {
      if (resetValues) form.reset(resetValues);
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

  const handleRepeat = async () => {
    if (!onRepeat) return;

    const { error } = await onRepeat(form.getValues());
    if (error) {
      return toast.error(error);
    }

    toast.success("Repeated successfully!");
    onSuccess?.();
  };

  if (appearance === "transaction") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-3xl p-0"
          onOpenAutoFocus={(event) => {
            if (!initialFocusRef?.current) return;
            event.preventDefault();
            initialFocusRef.current.focus();
          }}
        >
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex h-[min(34rem,90vh)] flex-col"
            >
              <DialogHeader className="flex-row items-center gap-3 space-y-0 px-6 pt-6 sm:px-8">
                <DialogTitle>
                  {customTitle || `${isEdit ? "Edit" : "Add"} ${title}`}
                </DialogTitle>
              </DialogHeader>

              <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-10 sm:px-8">
                {children}
              </div>

              <div className="border-t px-6 py-5 sm:px-8">
                {footerFields ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {footerFields}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {type ? <TemplateSelect type={type} /> : null}
                    {isEdit && onRepeat ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRepeat}
                        disabled={isRepeating}
                      >
                        <Repeat2 className="size-4" />
                      </Button>
                    ) : null}
                    {isEdit && onDelete ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        aria-label={`Delete ${title.toLowerCase()}`}
                      >
                        <Trash className="size-4" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-4">
                    {!isEdit ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`add-another-${title.toLowerCase()}`}
                          checked={addAnother}
                          onCheckedChange={setAddAnother}
                        />
                        <label
                          htmlFor={`add-another-${title.toLowerCase()}`}
                          className="text-muted-foreground text-sm"
                        >
                          Create more
                        </label>
                      </div>
                    ) : null}
                    <SubmitButton
                      type="submit"
                      size="sm"
                      disabled={isLoading}
                      isLoading={isLoading}
                      className="rounded-full px-5"
                    >
                      {submitLabel ||
                        (isEdit ? "Update" : `Create ${title.toLowerCase()}`)}
                    </SubmitButton>
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

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
            <div className="flex justify-end gap-2">
              {type && <TemplateSelect type={type} />}
              {isEdit && onRepeat && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRepeat}
                  disabled={isRepeating}
                >
                  <Repeat2 className="size-4" />
                </Button>
              )}
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
                  disabled={isDeleting}
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
