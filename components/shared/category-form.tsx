"use client";

import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { EntityForm } from "@/components/shared/entity-form";
import CreatableMultiSelect from "@/components/ui/creatable-multi-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/contexts/workspace-context";
import { ICONS } from "@/utils/constants";
import { invalidateWorkspaceQueries } from "@/utils/query-cache";
import { Database } from "@/utils/supabase/database.types";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/utils/supabase/mutations";
import { Category } from "@/utils/supabase/types";

interface CategoryFormProps {
  type: "income" | "expense";
  onSuccess?: () => void;
  category?: Category;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type CategoryFormValues = Database["public"]["Tables"]["categories"]["Insert"];
type RequiredSpendKind = "none" | "atemporal" | "temporal";

function normalizeCategoryValues(values: CategoryFormValues): CategoryFormValues {
  const requiredSpendKind = (values.required_spend_kind ?? "none") as RequiredSpendKind;

  return {
    ...values,
    required_spend_kind: requiredSpendKind,
  };
}

function CategoryRequiredSpendFields() {
  return (
    <FormField
      name="required_spend_kind"
      render={({ field }) => (
        <FormItem className="rounded-lg border p-3">
          <div className="space-y-1">
            <Label>Required spend</Label>
            <p className="text-muted-foreground text-sm">
              Choose whether this category belongs to the always-on baseline or
              the bill-like required baseline.
            </p>
          </div>
          <FormControl>
            <Select
              value={(field.value ?? "none") as string}
              onValueChange={field.onChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select requirement mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not required</SelectItem>
                <SelectItem value="atemporal">Atemporal required</SelectItem>
                <SelectItem value="temporal">Temporal required</SelectItem>
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

const CategoryForm = ({
  type,
  open,
  category,
  onSuccess,
  onOpenChange,
}: CategoryFormProps) => {
  const { activeWorkspace } = useWorkspace();
  const defaultValues: Omit<CategoryFormValues, "workspace_id"> = {
    type,
    name: "",
    icon: ICONS[Math.floor(Math.random() * ICONS.length)],
    required_spend_kind: "none",
    keywords: [],
  };

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (values: Omit<CategoryFormValues, "workspace_id">) => {
      const workspaceId = activeWorkspace?.id;
      if (!workspaceId) throw new Error("No workspace selected");
      return await createCategory({ ...values, workspace_id: workspaceId });
    },
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
      toast.success(`Added category in ${type}`);
      onSuccess?.();
    },
    onError(error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create category");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      return await updateCategory({ ...values, id: category?.id });
    },
    onSuccess: () => {
      void invalidateWorkspaceQueries(queryClient);
      onSuccess?.();
    },
    onError(error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update category");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!category?.id) throw new Error("No category ID provided");
      return await deleteCategory(category.id);
    },
    onSuccess: () => {
      invalidateWorkspaceQueries(queryClient);
      onSuccess?.();
    },
    onError(error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to delete category");
      }
    },
  });

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const handleSubmit = (values: CategoryFormValues) => {
    return new Promise<{ error?: string }>((resolve) => {
      const normalizedValues = normalizeCategoryValues(values);
      if (category) {
        updateMutation.mutate(normalizedValues, {
          onSuccess: () => resolve({}),
          onError: (error: unknown) => {
            if (error instanceof Error) {
              resolve({ error: error.message });
            } else {
              resolve({ error: "Failed to update category" });
            }
          },
        });
      } else {
        createMutation.mutate(normalizedValues, {
          onSuccess: () => resolve({}),
          onError: (error: unknown) => {
            if (error instanceof Error) {
              resolve({ error: error.message });
            } else {
              resolve({ error: "Failed to create category" });
            }
          },
        });
      }
    });
  };

  const handleDelete = () => {
    return new Promise<{ error?: string }>((resolve) => {
      deleteMutation.mutate(undefined, {
        onSuccess: () => resolve({}),
        onError: (error: unknown) => {
          if (error instanceof Error) {
            resolve({ error: error.message });
          } else {
            resolve({ error: "Failed to delete category" });
          }
        },
      });
    });
  };

  return (
    <EntityForm
      title="Category"
      entity={
        category
          ? {
              ...category,
              required_spend_kind: category.required_spend_kind ?? "none",
            }
          : undefined
      }
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      isLoading={isLoading}
    >
      <div className="flex gap-4">
        {/* <div className="flex-1">
          <FormField
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Icon name={field.value} className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full">
                      <ToggleGroup
                        type="single"
                        value={field.value}
                        onValueChange={field.onChange}
                        className="grid grid-cols-8"
                      >
                        {ICONS?.map((name) => (
                          <ToggleGroupItem key={name} value={name} size="sm">
                            <Icon name={name} className="h-4 w-4" />
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div> */}
        <div className="flex-1">
          <FormField
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="text" placeholder="Enter name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      <FormField
        name="keywords"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <CreatableMultiSelect
                value={field.value || []}
                onChange={field.onChange}
                placeholder="Add keywords"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {type === "expense" && <CategoryRequiredSpendFields />}
    </EntityForm>
  );
};

export default CategoryForm;
