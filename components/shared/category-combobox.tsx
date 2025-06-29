import React from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCategories } from "@/contexts/settings-context";
import { ICONS } from "@/utils/constants";
import { Database } from "@/utils/supabase/database.types";
import { createCategory } from "@/utils/supabase/mutations";
import { toast } from "sonner";
import { Label } from "../ui/label";

interface CategoryComboboxProps {
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
  type?: "income" | "expense" | "transfer";
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

const CategoryCombobox = ({
  size = "default",
  icon,
  variant = "outline",
  type,
  value,
  onChange,
  placeholder = "Select category...",
  className,
}: CategoryComboboxProps) => {
  const [selectedType, setSelectedType] = React.useState<
    "income" | "expense" | undefined
  >(type === "income" || type === "expense" ? type : undefined);
  const [categories] = useCategories();

  // Use selectedType if type prop is not provided
  const effectiveType = type || selectedType;

  const filteredCategories = effectiveType
    ? categories.filter((category) => category.type === effectiveType)
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

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!effectiveType) {
        throw new Error("Please select a category type first");
      }

      const values: Database["public"]["Tables"]["categories"]["Insert"] = {
        name,
        type: effectiveType,
        icon: ICONS[Math.floor(Math.random() * ICONS.length)],
        keywords: [],
      };
      const result = await createCategory(values);
      return result[0];
    },
    onSuccess: (data, name) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Added ${name} in ${effectiveType}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // If type is not provided, show type selector first
  if (!type) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <RadioGroup
            value={selectedType}
            onValueChange={(value: "income" | "expense") =>
              setSelectedType(value)
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="income" id="income" />
              <Label
                htmlFor="income"
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Income
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="expense" id="expense" />
              <Label
                htmlFor="expense"
                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Expense
              </Label>
            </div>
          </RadioGroup>
        </div>

        {selectedType && (
          <Combobox
            variant={variant}
            size={size}
            icon={icon}
            options={options}
            value={value ?? ""}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            onCreateOption={async (name) => {
              const newCat = await createMutation.mutateAsync(name);
              return newCat
                ? {
                    value: newCat.id,
                    label: newCat.name,
                    keywords: newCat.keywords || [newCat.name.toLowerCase()],
                  }
                : undefined;
            }}
          />
        )}
      </div>
    );
  }

  return (
    <Combobox
      variant={variant}
      size={size}
      icon={icon}
      options={options}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      onCreateOption={async (name) => {
        const newCat = await createMutation.mutateAsync(name);
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
