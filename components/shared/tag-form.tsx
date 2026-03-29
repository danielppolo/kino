"use client";

import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Input } from "../ui/input";
import GroupCombobox from "./group-combobox";

import { EntityForm } from "@/components/shared/entity-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useWorkspace } from "@/contexts/workspace-context";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { Database } from "@/utils/supabase/database.types";
import { createTag, deleteTag, updateTag } from "@/utils/supabase/mutations";
import { Tag } from "@/utils/supabase/types";

interface TagFormProps {
  tag?: Tag;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type TagFormValues = Database["public"]["Tables"]["tags"]["Insert"];

const TagForm = ({ tag, onSuccess, open, onOpenChange }: TagFormProps) => {
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (values: Omit<TagFormValues, "workspace_id">) => {
      const workspaceId = activeWorkspace?.id;
      if (!workspaceId) throw new Error("No workspace selected");
      return createTag({ ...values, workspace_id: workspaceId });
    },
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
      onSuccess?.();
    },
    onError(error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create tag",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: TagFormValues) =>
      updateTag({ ...values, id: tag?.id } as Database["public"]["Tables"]["tags"]["Update"]),
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
      onSuccess?.();
    },
    onError(error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update tag",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!tag?.id) throw new Error("No tag ID provided");
      return deleteTag(tag.id);
    },
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
      onSuccess?.();
    },
    onError(error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete tag",
      );
    },
  });

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const defaultValues: Omit<TagFormValues, "workspace_id"> & { workspace_id?: string } = { title: "", group: "" };

  const handleSubmit = (values: TagFormValues) => {
    // Trim the title field to remove leading and trailing spaces
    const trimmedValues = {
      ...values,
      title: values.title?.trim() || "",
    };

    return new Promise<{ error?: string }>((resolve) => {
      if (tag) {
        updateMutation.mutate(
          { ...trimmedValues, workspace_id: tag.workspace_id } as TagFormValues,
          {
            onSuccess: () => resolve({}),
            onError: (error: unknown) =>
              resolve({
                error:
                  error instanceof Error ? error.message : "Failed to update tag",
              }),
          },
        );
      } else {
        createMutation.mutate(trimmedValues, {
          onSuccess: () => resolve({}),
          onError: (error: unknown) =>
            resolve({
              error:
                error instanceof Error ? error.message : "Failed to create tag",
            }),
        });
      }
    });
  };

  const handleDelete = () => {
    return new Promise<{ error?: string }>((resolve) => {
      deleteMutation.mutate(undefined, {
        onSuccess: () => resolve({}),
        onError: (error: unknown) =>
          resolve({
            error:
              error instanceof Error ? error.message : "Failed to delete tag",
          }),
      });
    });
  };

  return (
    <EntityForm
      title="Tag"
      entity={tag}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      isLoading={isLoading}
    >
      <FormField
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input type="text" placeholder="Enter title" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        name="group"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <GroupCombobox
                value={field.value || ""}
                onChange={field.onChange}
                placeholder="Enter group"
                className="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </EntityForm>
  );
};

export default TagForm;
