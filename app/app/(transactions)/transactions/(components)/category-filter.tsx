"use client";

import { Cone } from "lucide-react";

import CategoryCombobox from "@/components/shared/category-combobox";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";

const CategoryFilter = () => {
  const [filters, setFilters] = useTransactionQueryState();
  const categoryId = filters.category_id || undefined;

  const setCategoryId = (id: string | undefined) => {
    setFilters({ category_id: id ?? null });
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
