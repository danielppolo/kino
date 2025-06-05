"use client";

import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Input } from "../ui/input";

import { EntityForm } from "@/components/shared/entity-form";
import CreatableMultiSelect from "@/components/ui/creatable-multi-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { ICONS } from "@/utils/constants";
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

const CategoryForm = ({
  type,
  open,
  category,
  onSuccess,
  onOpenChange,
}: CategoryFormProps) => {
  const defaultValues: CategoryFormValues = {
    type,
    name: "",
    icon: ICONS[Math.floor(Math.random() * ICONS.length)],
    keywords: [],
  };

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      return await createCategory(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
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
      queryClient.invalidateQueries({ queryKey: ["categories"] });
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
      queryClient.invalidateQueries();
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

  const handleSubmit = (values: CategoryFormValues) => {
    return new Promise<{ error?: string }>((resolve) => {
      if (category) {
        updateMutation.mutate(values, {
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
        createMutation.mutate(values, {
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
      entity={category}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
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
    </EntityForm>
  );
};

export default CategoryForm;
