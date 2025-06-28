"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import CategorySection from "./(components)/category-section";

import { Title } from "@/components/ui/typography";
import { useCategories } from "@/contexts/settings-context";
import { Category } from "@/utils/supabase/types";

export default function Page() {
  const [categories] = useCategories();
  const [selected, setSelected] = useState<string[]>([]);

  const selectedCategories = useMemo(
    () =>
      selected
        .map((id) => categories.find((c) => c.id === id))
        .filter(Boolean) as Category[],
    [selected, categories],
  );
  const selectedType =
    selectedCategories.length > 0 &&
    selectedCategories.every((c) => c.type === selectedCategories[0].type)
      ? selectedCategories[0].type
      : null;

  const toggleSelect = (category: Category) => {
    setSelected((prev) => {
      const exists = prev.includes(category.id);
      if (exists) return prev.filter((id) => id !== category.id);

      // Prevent selecting transfer categories
      if (category.type === "transfer") {
        toast.error("Transfer categories cannot be merged");
        return prev;
      }

      if (prev.length > 0 && selectedType && category.type !== selectedType) {
        toast.error("Select categories of the same type");
        return prev;
      }
      return [...prev, category.id];
    });
  };

  const handleMergeSuccess = () => {
    setSelected([]);
  };

  return (
    <div>
      <Title>Categories</Title>
      <CategorySection
        type="income"
        title="Income"
        selected={selected}
        onToggle={toggleSelect}
        onMergeSuccess={handleMergeSuccess}
      />
      <CategorySection
        type="expense"
        title="Expense"
        selected={selected}
        onToggle={toggleSelect}
        onMergeSuccess={handleMergeSuccess}
      />
    </div>
  );
}
