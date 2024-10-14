"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Icon } from "../ui/icon";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { ICONS } from "@/utils/constants";
import { Database } from "@/utils/supabase/database.types";
import { createCategory } from "@/utils/supabase/mutations";

interface CategoryFormProps {
  type: "income" | "expense";
  onSuccess?: () => void;
}

type CategoryFormValues = Database["public"]["Tables"]["categories"]["Insert"];

const CategoryForm = ({ type, onSuccess }: CategoryFormProps) => {
  const form = useForm<CategoryFormValues>({
    defaultValues: {
      type,
      icon: ICONS[Math.floor(Math.random() * ICONS.length)],
    },
  });

  const onSubmit = async (category: CategoryFormValues) => {
    const { error } = await createCategory(category);

    if (error) {
      return toast.error(error);
    }

    toast.success("Label added successfully!");
    onSuccess?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-4">
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

        <Button type="submit" size="sm">
          Save
        </Button>
      </form>
    </Form>
  );
};

export default CategoryForm;
