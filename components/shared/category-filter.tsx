"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Category from "./category";

import { createClient } from "@/utils/supabase/client";
import { listCategories } from "@/utils/supabase/queries";
import { Category as CategoryType } from "@/utils/supabase/types";

interface CategoryFilterProps {
  options?: CategoryType[];
}

const CategoryFilter = (props: CategoryFilterProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get("category_id");
  const supabase = createClient();
  const { data } = useQuery(listCategories(supabase));

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
    <ToggleGroup
      type="single"
      onValueChange={handleCategoryClick}
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
