"use client";

import CategoryPicker from "./category-picker";

import { useFilter } from "@/app/protected/filter-context";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryFilterProps {
  options?: CategoryType[];
}

const CategoryFilter = (props: CategoryFilterProps) => {
  const {
    filters: { category_id },
    setCategoryId,
  } = useFilter();

  return <CategoryPicker value={category_id} onChange={setCategoryId} />;
};

export default CategoryFilter;
