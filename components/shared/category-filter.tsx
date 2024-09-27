"use client";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Category from "./category";

import { useFilter } from "@/app/protected/filter-context";
import { createClient } from "@/utils/supabase/client";
import { listCategories } from "@/utils/supabase/queries";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryFilterProps {
  options?: CategoryType[];
}

const CategoryFilter = (props: CategoryFilterProps) => {
  const {
    filters: { category_id },
    setCategoryId,
  } = useFilter();
  const supabase = createClient();
  const { data } = useQuery(listCategories(supabase));

  return (
    <ToggleGroup
      type="single"
      value={category_id}
      onValueChange={setCategoryId}
      className="w-full overflow-x-auto no-scrollbar p-2"
    >
      {data?.map((item) => (
        <ToggleGroupItem key={item.id} value={item.id} aria-label="Toggle bold">
          <Category category={item} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};

export default CategoryFilter;
