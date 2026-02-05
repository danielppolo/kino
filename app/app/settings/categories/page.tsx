"use client";

import { useEffect, useState } from "react";
import { Plus, SquaresUnite, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import CategorySection from "./(components)/category-section";
import DeleteCategoriesDialog from "./(components)/delete-categories-dialog";
import MergeCategoriesDialog from "./(components)/merge-categories-dialog";

import { BulkActions } from "@/components/shared/bulk-actions";
import CategoryForm from "@/components/shared/category-form";
import PageHeader from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useCategories } from "@/contexts/settings-context";
import { useSelection } from "@/hooks/use-selection";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { Category } from "@/utils/supabase/types";

export default function Page() {
  const [categories] = useCategories();
  const [open, setOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeType = searchParams.get("type") || "expense";
  const visibleCategories = categories.filter(
    (category) => category.type === activeType,
  );

  const {
    selected,
    selectedCount,
    clearSelection,
    toggleSelection,
    selectAll,
  } = useSelection({
    getAllIds: () => visibleCategories.map((category) => category.id),
  });

  const selectedCategories = selected
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean) as Category[];
  const selectedType =
    selectedCategories.length > 0 &&
    selectedCategories.every((c) => c.type === selectedCategories[0].type)
      ? (selectedCategories[0].type as "income" | "expense")
      : null;

  const toggleSelect = (category: Category, shiftKey = false) => {
    // Prevent selecting transfer categories for any bulk operations
    if (category.type === "transfer") {
      toast.error("Transfer categories cannot be selected for bulk operations");
      return;
    }

    if (selectedCount > 0 && selectedType && category.type !== selectedType) {
      toast.error("Select categories of the same type");
      return;
    }

    toggleSelection(category.id, shiftKey);
  };

  const handleAdd = () => {
    setSelectedCategory(null);
    setOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedCategory(null);
  };

  const handleMergeSuccess = () => {
    setMergeDialogOpen(false);
    clearSelection();
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    clearSelection();
  };

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", value);
    router.push(`/app/settings/categories?${params.toString()}`);
  };

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setSelectedCategory(null);
    setOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canUseGlobalShortcuts()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (selectedCount === 0) return;

      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        setDeleteDialogOpen(true);
      }
      if (
        event.key.toLowerCase() === "m" &&
        selectedCount >= 2 &&
        selectedType
      ) {
        event.preventDefault();
        setMergeDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCount, selectedType]);

  return (
    <>
      <Tabs onValueChange={handleTabChange} defaultValue={activeType}>
        <PageHeader>
          <div className="flex items-center gap-4">
            <TabsList>
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex gap-2">
            <TooltipButton
              size="sm"
              variant="outline"
              tooltip="Add category"
              onClick={handleAdd}
            >
              <Plus className="size-4" />
            </TooltipButton>
          </div>
        </PageHeader>
        <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
          <TabsContent value="income">
            <CategorySection
              type="income"
              selected={selected}
              onToggle={toggleSelect}
              onEdit={handleEdit}
              selectAll={selectAll}
              isActive={activeType === "income"}
            />
          </TabsContent>

          <TabsContent value="expense">
            <CategorySection
              type="expense"
              selected={selected}
              onToggle={toggleSelect}
              onEdit={handleEdit}
              selectAll={selectAll}
              isActive={activeType === "expense"}
            />
          </TabsContent>
        </div>
      </Tabs>

      <CategoryForm
        type={(searchParams.get("type") as "income" | "expense") || "expense"}
        category={selectedCategory ?? undefined}
        open={open}
        onOpenChange={handleClose}
        onSuccess={handleClose}
      />
      <MergeCategoriesDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        selected={selected}
        type={selectedType}
        onSuccess={handleMergeSuccess}
      />
      <DeleteCategoriesDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selected={selected}
        onSuccess={handleDeleteSuccess}
      />

      <BulkActions
        selectedCount={selectedCount}
        clearSelection={clearSelection}
        selectAll={selectAll}
      >
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Delete selected categories (D)"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={selectedCount === 0}
        >
          <Trash2 className="size-4" />
        </TooltipButton>
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Merge selected categories (M)"
          onClick={() => setMergeDialogOpen(true)}
          disabled={selectedCount < 2 || !selectedType}
        >
          <SquaresUnite className="size-4" />
        </TooltipButton>
      </BulkActions>
    </>
  );
}
