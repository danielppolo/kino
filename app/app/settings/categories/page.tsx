"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import CategorySection from "./(components)/category-section";
import MergeCategoriesDialog from "./(components)/merge-categories-dialog";

import { Button } from "@/components/ui/button";
import { Title } from "@/components/ui/typography";
import { useCategories } from "@/contexts/settings-context";
import { Category } from "@/utils/supabase/types";

export default function Page() {
  const [categories] = useCategories();
  const [selected, setSelected] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedCategories = useMemo(
    () => selected.map((id) => categories.find((c) => c.id === id)).filter(Boolean) as Category[],
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
      if (prev.length > 0 && selectedType && category.type !== selectedType) {
        toast.error("Select categories of the same type");
        return prev;
      }
      return [...prev, category.id];
    });
  };

  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <Title>Categories</Title>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setDialogOpen(true)}
        disabled={selected.length < 2 || !selectedType}
      >
        Merge Selected
      </Button>
      <MergeCategoriesDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelected([]);
        }}
        selected={selected}
        type={selectedType}
      />
      <CategorySection type="income" title="Income" selected={selected} onToggle={toggleSelect} />
      <CategorySection type="expense" title="Expense" selected={selected} onToggle={toggleSelect} />
    </div>
  );
}
