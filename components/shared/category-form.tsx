"use client";

import { Icon } from "../ui/icon";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

import { EntityForm } from "@/components/shared/entity-form";
import { Button } from "@/components/ui/button";
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

  const handleSubmit = async (values: CategoryFormValues) => {
    let error;
    if (category) {
      ({ error } = await updateCategory({ ...values, id: category.id }));
    } else {
      ({ error } = await createCategory(values));
    }
    return { error: error?.message };
  };

  const handleDelete = async () => {
    if (!category?.id) return { error: "No category ID provided" };
    const { error } = await deleteCategory(category.id);
    return { error: error?.message };
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
        <div className="flex-1">
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
        </div>
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
