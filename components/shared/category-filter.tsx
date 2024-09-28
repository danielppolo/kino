"use client";

import { CircleDashed, X } from "lucide-react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Category from "./category";

import { useFilter } from "@/app/protected/filter-context";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useCategoryDictionary from "@/hooks/useCategoryDictionary";
import { createClient } from "@/utils/supabase/client";
import { listCategories } from "@/utils/supabase/queries";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryFilterProps {
  options?: CategoryType[];
}
const supabase = createClient();

const CategoryFilter = (props: CategoryFilterProps) => {
  const {
    filters: { category_id },
    setCategoryId,
  } = useFilter();
  const { data: categories } = useQuery(listCategories(supabase));
  const categoriesDict = useCategoryDictionary();

  if (category_id && categoriesDict[category_id]) {
    return (
      <Button
        variant="ghost"
        className="peer group"
        size="sm"
        onClick={() => setCategoryId(undefined)}
      >
        <div className="group-hover:hidden flex items-center">
          <Category category={categoriesDict[category_id]} size="sm" />
        </div>
        <X className="hidden h-3 w-3 group-hover:block" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <CircleDashed className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
        <ToggleGroup
          type="single"
          value={category_id}
          onValueChange={setCategoryId}
          className="grid grid-cols-8 gap-2 p-2"
        >
          {categories?.map((category) => (
            <ToggleGroupItem key={category.id} value={category.id}>
              <Category category={category} size="sm" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  );
};

export default CategoryFilter;
