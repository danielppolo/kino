"use client";

import { CircleDotDashed } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Category from "./category";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useCategoryDictionary from "@/hooks/useCategoryDictionary";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryPickerProps {
  options: CategoryType[];
  type: "income" | "expense" | "transfer";
  defaultValue?: string;
  value?: string | null;
  onChange: (id: string) => void;
}

const CategoryPicker = ({
  options,
  value,
  defaultValue,
  type,
  onChange,
}: CategoryPickerProps) => {
  const categoryDict = useCategoryDictionary(options);
  const categories = options?.filter((category) => category.type === type);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          {value && categoryDict[value] ? (
            <>
              <Category category={categoryDict[value]} />
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
          onValueChange={onChange}
          className="grid grid-cols-8 gap-2 p-2"
        >
          {categories?.map((category) => (
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
