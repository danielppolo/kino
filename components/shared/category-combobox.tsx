import React from "react";

import Category from "./category";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useCategories } from "@/contexts/settings-context";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryComboboxProps {
  size?: "sm" | "default" | "lg";
  type?: "income" | "expense" | "transfer";
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

const CategoryCombobox = ({
  size = "default",
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

  // Map categories to ComboboxOption
  const options: ComboboxOption[] = filteredCategories.map((category) => ({
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
    filteredCategories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [filteredCategories]);

  return (
    <Combobox
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
    />
  );
};

export default CategoryCombobox;
