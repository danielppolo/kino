"use client";

import { CircleDotDashed, X } from "lucide-react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Category from "./category";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFilter } from "@/contexts/filter-context";
import useCategoryDictionary from "@/hooks/useCategoryDictionary";
import { createClient } from "@/utils/supabase/client";
import { listCategories } from "@/utils/supabase/queries";

const supabase = createClient();

const CategoryFilter = () => {
  const {
    filters: { category_id },
    setCategoryId,
  } = useFilter();

  const { data: categories } = useQuery(listCategories(supabase));
  const categoryDict = useCategoryDictionary();

  if (category_id && categoryDict[category_id]) {
    return (
      <Button
        variant="ghost"
        className="peer group"
        size="sm"
        onClick={() => setCategoryId(undefined)}
      >
        <div className="group-hover:hidden flex items-center">
          <Category category={categoryDict[category_id]} />
        </div>
        <X className="hidden h-3 w-3 group-hover:block" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <CircleDotDashed className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
        <ToggleGroup
          type="single"
          value={category_id}
          onValueChange={setCategoryId}
          className="grid grid-cols-8"
        >
          {categories?.map((category) => (
            <ToggleGroupItem key={category.id} value={category.id} size="sm">
              <Category category={category} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  );
};

export default CategoryFilter;
