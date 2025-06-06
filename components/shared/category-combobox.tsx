import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import Category from "./category";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useCategories } from "@/contexts/settings-context";
import { ICONS } from "@/utils/constants";
import { createCategory } from "@/utils/supabase/mutations";
import { Database } from "@/utils/supabase/database.types";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryComboboxProps {
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
  type?: "income" | "expense" | "transfer";
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

const CategoryCombobox = ({
  size = "default",
  variant = "outline",
  type,
  value,
  onChange,
  placeholder = "Select category...",
  className,
}: CategoryComboboxProps) => {
  const [categories] = useCategories();
  const filteredCategories = type
    ? categories.filter((category) => category.type === type)
    : categories;

  // Sort categories alphabetically by name
  const sortedCategories = [...filteredCategories].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // Map categories to ComboboxOption
  const options: ComboboxOption[] = sortedCategories.map((category) => ({
    value: category.id,
    label: category.name,
    keywords:
      Array.isArray(category.keywords) && category.keywords.length > 0
        ? category.keywords
        : [category.name.toLowerCase(), category.type, category.icon ?? ""],
  }));

  // For rendering, map id to category
  const categoryMap = React.useMemo(() => {
    const map = new Map<string, CategoryType>();
    sortedCategories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [sortedCategories]);

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const values: Database["public"]["Tables"]["categories"]["Insert"] = {
        name,
        type: type || "expense",
        icon: ICONS[Math.floor(Math.random() * ICONS.length)],
        keywords: [],
      };
      const result = await createCategory(values);
      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  return (
    <Combobox
      variant={variant}
      size={size}
      options={options}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      renderValue={(option) => {
        const cat = option && categoryMap.get(option.value);
        if (cat) {
          return (
            <span className="flex items-center gap-2">
              <Category category={cat} />
              <span>{cat.name}</span>
            </span>
          );
        }
        return placeholder;
      }}
      renderOption={(option) => {
        const cat = categoryMap.get(option.value);
        if (cat) {
          return (
            <span className="flex items-center gap-2">
              <Category category={cat} />
              <span>{cat.name}</span>
            </span>
          );
        }
        return option.label;
      }}
      onCreateOption={async (name) => {
        const newCat = await createMutation.mutateAsync(name);
        if (newCat) {
          onChange(newCat.id);
        }
        return newCat
          ? {
              value: newCat.id,
              label: newCat.name,
              keywords: newCat.keywords || [newCat.name.toLowerCase()],
            }
          : undefined;
      }}
    />
  );
};

export default CategoryCombobox;
