"use client";

import { useState } from "react";
import { CircleDotDashed } from "lucide-react";

import { DrawerPopover } from "../ui/drawer-popover";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Category from "./category";

import { Button } from "@/components/ui/button";
import { useCategories } from "@/contexts/settings-context";

interface CategoryPickerProps {
  type?: "income" | "expense" | "transfer";
  defaultValue?: string;
  value?: string | null;
  onChange: (id: string) => void;
}

const CategoryPicker = ({
  value,
  defaultValue,
  type,
  onChange,
}: CategoryPickerProps) => {
  const [open, setOpen] = useState(false);
  const [categories, categoriesMap] = useCategories();
  const filteredCategories = type
    ? categories?.filter((category) => category.type === type)
    : categories;
  const category = !!value && categoriesMap.get(value);

  const handleChange = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <DrawerPopover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="sm">
          {category ? (
            <Category category={category} />
          ) : (
            <CircleDotDashed className="w-3 h-3" />
          )}
        </Button>
      }
    >
      <ToggleGroup
        type="single"
        defaultValue={defaultValue}
        onValueChange={handleChange}
        className="grid grid-cols-8 gap-2"
      >
        {filteredCategories?.map((category) => (
          <ToggleGroupItem key={category.id} value={category.id}>
            <Category category={category} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </DrawerPopover>
  );
};

export default CategoryPicker;
