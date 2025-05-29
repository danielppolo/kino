"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Icon } from "../ui/icon";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

import { Button } from "@/components/ui/button";
import CreatableMultiSelect from "@/components/ui/creatable-multi-select";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { ICONS } from "@/utils/constants";
import { Database } from "@/utils/supabase/database.types";
import { createCategory, updateCategory } from "@/utils/supabase/mutations";
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
  const isEdit = !!category;
  const form = useForm<CategoryFormValues>({
    defaultValues: category
      ? {
          ...category,
          keywords: category.keywords || [],
        }
      : {
          type,
          icon: ICONS[Math.floor(Math.random() * ICONS.length)],
          keywords: [],
        },
  });

  useEffect(() => {
    if (open) {
      if (category) {
        form.reset({
          ...category,
          keywords: category.keywords || [],
        });
      } else {
        form.reset({
          type,
          icon: ICONS[Math.floor(Math.random() * ICONS.length)],
          keywords: [],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, open]);

  const onSubmit = async (values: CategoryFormValues) => {
    let error;
    if (isEdit) {
      ({ error } = await updateCategory({ ...values, id: category!.id }));
    } else {
      ({ error } = await createCategory(values));
    }
    if (error) {
      return toast.error(error.message || String(error));
    }
    toast.success(
      isEdit ? "Category updated successfully!" : "Label added successfully!",
    );
    onSuccess?.();
  };

  return (
    <DrawerDialog
      title={isEdit ? "Edit Category" : "Add Category"}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex gap-4">
            <div className="flex-1">
              <FormField
                control={form.control}
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
                              <ToggleGroupItem
                                key={name}
                                value={name}
                                size="sm"
                              >
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
                control={form.control}
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
            control={form.control}
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
          <Button type="submit" size="sm" className="w-full">
            {isEdit ? "Save Changes" : "Save"}
          </Button>
        </form>
      </Form>
    </DrawerDialog>
  );
};

export default CategoryForm;
