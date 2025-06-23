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
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (values: TagFormValues) => createTag(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
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
      updateTag({ ...values, id: tag?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
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
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      onSuccess?.();
    },
    onError(error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete tag",
      );
    },
  });

  const defaultValues: TagFormValues = { title: "", group: "" };

  const handleSubmit = (values: TagFormValues) => {
    return new Promise<{ error?: string }>((resolve) => {
      if (tag) {
        updateMutation.mutate(values, {
          onSuccess: () => resolve({}),
          onError: (error: unknown) =>
            resolve({
              error:
                error instanceof Error ? error.message : "Failed to update tag",
            }),
        });
      } else {
        createMutation.mutate(values, {
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
