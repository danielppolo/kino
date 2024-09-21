"use client";

import { useRouter, useSearchParams } from "next/navigation";

import Category from "./category";

import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryFilterProps {
  options: CategoryType[];
}

const CategoryFilter = ({ options }: CategoryFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get("category_id");

  const handleCategoryClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update the 'category' search param
    if (id === value) {
      params.delete("category_id"); // Remove the category_id if already selected
    } else {
      params.set("category_id", id); // Set the new category_id
    }

    // Push the new search param to the URL
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="grid grid-cols-8 gap-2 p-2">
      {options.map((item) => (
        <Category
          key={item.id}
          category={item}
          isSelected={value === item.id}
          onClick={() => handleCategoryClick(item.id)}
        />
      ))}
    </div>
  );
};

export default CategoryFilter;
