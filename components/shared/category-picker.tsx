"use client";

import { useState } from "react";
import { CircleDotDashed } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Category from "./category";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCategories } from "@/contexts/settings-context";

interface CategoryPickerProps {
  type: "income" | "expense" | "transfer";
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
  const [categories, categoriesDict] = useCategories();
  const filteredCategories = categories?.filter(
    (category) => category.type === type,
  );

  const handleChange = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          {value && categoriesDict[value] ? (
            <>
              <Category category={categoriesDict[value]} />
            </>
          ) : (
            <CircleDotDashed className="w-3 h-3" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
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
      </PopoverContent>
    </Popover>
  );
};

export default CategoryPicker;
