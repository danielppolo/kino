"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface WorkspaceFormData {
  name: string;
}

interface WorkspaceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace?: { id: string; name: string };
  onSubmit: (data: WorkspaceFormData) => Promise<void>;
  isLoading?: boolean;
}

export function WorkspaceForm({
  open,
  onOpenChange,
  workspace,
  onSubmit,
  isLoading,
}: WorkspaceFormProps) {
  const isEdit = !!workspace;

  const form = useForm<WorkspaceFormData>({
    defaultValues: {
      name: workspace?.name || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: workspace?.name || "",
      });
    }
  }, [workspace, open, form]);

  const handleSubmit = async (values: WorkspaceFormData) => {
    try {
      await onSubmit(values);
      toast.success(
        isEdit ? "Workspace updated!" : "Workspace created!",
      );
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Workspace" : "Create Workspace"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the workspace name."
              : "Create a new workspace to organize your wallets and data."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              rules={{
                required: "Workspace name is required",
                minLength: {
                  value: 2,
                  message: "Name must be at least 2 characters",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Workspace"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
