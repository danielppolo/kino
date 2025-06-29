"use client";

import { useRouter, useSearchParams } from "next/navigation";

import CategoryCombobox from "@/components/shared/category-combobox";
import { Cone } from "lucide-react";

const CategoryFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category_id") ?? undefined;

  const setCategoryId = (id: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("category_id", id);
    } else {
      params.delete("category_id");
    }
    router.push(`/app/transactions?${params.toString()}`);
  };

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
  };

  return (
    <CategoryCombobox
      size="sm"
      icon={<Cone className="size-4" />}
      variant={categoryId ? "secondary" : "ghost"}
      value={categoryId ?? null}
      onChange={handleCategoryChange}
      placeholder="Category"
      className="w-auto"
    />
  );
};

export default CategoryFilter;
