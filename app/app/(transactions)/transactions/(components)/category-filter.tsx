"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import Category from "@/components/shared/category";
import CategoryPicker from "@/components/shared/category-picker";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/contexts/settings-context";

const CategoryFilter = () => {
  const router = useRouter();
  const [, categoriesMap] = useCategories();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category_id") ?? undefined;
  const category = categoryId && categoriesMap.get(categoryId);

  const setCategoryId = (id: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("category_id", id);
    } else {
      params.delete("category_id");
    }
    router.push(`/app/transactions?${params.toString()}`);
  };

  if (category) {
    return (
      <Button
        variant="ghost"
        className="peer group"
        size="sm"
        onClick={() => setCategoryId(undefined)}
      >
        <div className="group-hover:hidden flex items-center">
          <Category category={category} />
        </div>
        <X className="hidden h-3 w-3 group-hover:block" />
      </Button>
    );
  }

  return <CategoryPicker onChange={setCategoryId} value={categoryId} />;
};

export default CategoryFilter;
