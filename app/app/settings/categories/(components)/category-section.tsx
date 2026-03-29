"use client";

import { useQuery } from "@tanstack/react-query";

import CategoryRow from "@/components/shared/category-row";
import EmptyState from "@/components/shared/empty-state";
import { useCategories } from "@/contexts/settings-context";
import { useKeyboardListNavigation } from "@/hooks/use-keyboard-list-navigation";
import { createClient } from "@/utils/supabase/client";
import { getCategoryTransactionCounts } from "@/utils/supabase/queries";
import { Category } from "@/utils/supabase/types";

type TransactionCountLookup = Record<string, number>;

interface CategoriesProps {
  type: "income" | "expense";
  selected: string[];
  onToggle: (category: Category, shiftKey: boolean) => void;
  onEdit: (category: Category) => void;
  selectAll: () => void;
  isActive: boolean;
}

export default function CategorySection({
  type,
  selected,
  onToggle,
  onEdit,
  selectAll,
  isActive,
}: CategoriesProps) {
  const [categories] = useCategories();

  const filteredCategories = categories
    .filter((category) => category.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Fetch transaction counts using react-query
  const { data: transactionCountsData } = useQuery<TransactionCountLookup>({
    queryKey: ["category-transaction-counts", type],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getCategoryTransactionCounts(supabase, {
        type,
      });

      if (error) {
        throw error;
      }

      return Object.fromEntries(
        (data ?? []).map((item) => [item.category_id, item.transaction_count]),
      );
    },
  });

  const { activeId, setActiveId } = useKeyboardListNavigation({
    items: filteredCategories,
    getItemId: (category) => category.id,
    onEnter: onEdit,
    onSpace: (category) => onToggle(category, false),
    onSelectAll: selectAll,
    enabled: isActive,
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
    const transactionCount = transactionCountsData?.[category.id] || 0;
    return (
      <CategoryRow
        key={`${category.id}-${transactionCount}`}
        category={category}
        onClick={() => {
          setActiveId(category.id);
          onEdit(category);
        }}
        selected={isSelected}
        selectionMode={selected.length > 0}
        onToggleSelect={(e) => onToggle(category, e.shiftKey)}
        transactionCount={transactionCount}
        active={category.id === activeId}
      />
    );
  });
}
