"use client";

import { useQuery } from "@tanstack/react-query";

import CategoryRow from "@/components/shared/category-row";
import EmptyState from "@/components/shared/empty-state";
import { useCategories } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getCategoryTransactionCounts } from "@/utils/supabase/queries";
import { Category } from "@/utils/supabase/types";

interface CategoriesProps {
  type: "income" | "expense";
  selected: string[];
  onToggle: (category: Category, shiftKey: boolean) => void;
  onEdit: (category: Category) => void;
}

export default function CategorySection({
  type,
  selected,
  onToggle,
  onEdit,
}: CategoriesProps) {
  const [categories] = useCategories();

  const filteredCategories = categories
    .filter((category) => category.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Fetch transaction counts using react-query
  const { data: transactionCountsData } = useQuery({
    queryKey: ["category-transaction-counts", type],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getCategoryTransactionCounts(supabase, {
        type,
      });

      if (error) {
        throw error;
      }

      // Convert array to Map for easier lookup
      const countsMap = new Map<string, number>();
      data?.forEach((item) => {
        countsMap.set(item.category_id, item.transaction_count);
      });

      return countsMap;
    },
  });

  if (filteredCategories.length === 0) {
    return (
      <EmptyState
        title="No categories found"
        description="Please try again or add a new category."
      />
    );
  }

  return filteredCategories.map((category) => {
    const isSelected = selected.includes(category.id);
    const transactionCount = transactionCountsData?.get(category.id) || 0;
    return (
      <CategoryRow
        key={`${category.id}-${transactionCount}`}
        category={category}
        onClick={(e) => onEdit(category)}
        selected={isSelected}
        selectionMode={selected.length > 0}
        onToggleSelect={(e) => onToggle(category, e.shiftKey)}
        transactionCount={transactionCount}
      />
    );
  });
}
