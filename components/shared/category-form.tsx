"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useInsertMutation } from "@supabase-cache-helpers/postgrest-react-query";

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
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/utils/supabase/database.types";

const supabase = createClient();

const ICONS = [
  "dollar-sign",
  "credit-card",
  "banknote",
  "piggy-bank",
  "wallet",
  "cash",
  "shopping-cart",
  "cart",
  "cart-check",
  "receipt",
  "tag",
  "tags",
  "sale",
  "chart",
  "chart-bar",
  "chart-pie",
  "bar-chart",
  "pie-chart",
  "briefcase",
  "coin",
  "gift",
  "handshake",
  "savings",
  "transfer",
  "money",
  "bag",
  "clipboard",
  "calendar",
  "clock",
  "home",
  "house",
  "building",
  "bag-dollar",
  "check-circle",
  "x-circle",
  "alert-circle",
  "chart-line",
  "trending-up",
  "trending-down",
  "file-text",
  "edit",
  "folder",
  "folder-open",
  "plus-circle",
  "minus-circle",
  "download-cloud",
  "upload-cloud",
  "shield",
  "shield-check",
  "check-square",
  "percent",
  "calculator",
  "credit-card-check",
  "credit-card-plus",
  "credit-card-minus",
  "credit-card-off",
  "box",
  "archive",
  "box-dollar",
  "coins",
  "dollar-square",
  "clipboard-check",
  "refresh-cw",
  "refresh-ccw",
  "arrow-up-right",
  "arrow-down-right",
  "repeat",
  "send",
  "edit-2",
  "key",
  "lock",
  "unlock",
  "lock-open",
  "safe",
  "safe-check",
  "bank",
  "atm",
  "briefcase-dollar",
  "bag-dollar-2",
  "currency",
  "globe",
  "cloud",
  "umbrella",
  "shopping-bag",
  "plane",
  "car",
  "bus",
  "ticket",
  "shopping-basket",
  "gift-card",
  "business",
  "cash-register",
  "check",
  "x-square",
  "chart-line-down",
  "arrow-right",
  "arrow-left",
  "currency-dollar",
  "calculator-check",
  "clipboard-list",
  "shopping-bag-check",
];

interface CategoryFormProps {
  type: "income" | "expense";
  onSuccess?: () => void;
}

type CategoryFormValues = Database["public"]["Tables"]["categories"]["Insert"];

const CategoryForm = ({ type, onSuccess }: CategoryFormProps) => {
  const { mutateAsync: insert } = useInsertMutation(
    supabase.from("categories"),
    ["id"],
    "*",
    {
      onSuccess: () => {
        toast.success("Label added successfully!");
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const form = useForm<CategoryFormValues>({
    defaultValues: {
      type,
      icon: ICONS[Math.floor(Math.random() * ICONS.length)],
    },
  });

  const onSubmit = (label: CategoryFormValues) => {
    insert([label]);
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
