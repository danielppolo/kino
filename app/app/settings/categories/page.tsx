"use client";

import { useMemo, useState } from "react";
import { Combine, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import CategorySection from "./(components)/category-section";
import DeleteCategoriesDialog from "./(components)/delete-categories-dialog";
import MergeCategoriesDialog from "./(components)/merge-categories-dialog";

import CategoryForm from "@/components/shared/category-form";
import { BulkActions } from "@/components/shared/bulk-actions";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Title } from "@/components/ui/typography";
import { useCategories } from "@/contexts/settings-context";
import { Category } from "@/utils/supabase/types";
import PageHeader from "@/components/shared/page-header";

export default function Page() {
  const [categories] = useCategories();
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const router = useRouter();
  const searchParams = useSearchParams();

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
      ? (selectedCategories[0].type as "income" | "expense")
      : null;

  const toggleSelect = (category: Category) => {
    setSelected((prev) => {
      const exists = prev.includes(category.id);
      if (exists) return prev.filter((id) => id !== category.id);

      // Prevent selecting transfer categories for any bulk operations
      if (category.type === "transfer") {
        toast.error(
          "Transfer categories cannot be selected for bulk operations",
        );
        return prev;
      }

      if (prev.length > 0 && selectedType && category.type !== selectedType) {
        toast.error("Select categories of the same type");
        return prev;
      }
      return [...prev, category.id];
    });
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
    setSelected([]);
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    setSelected([]);
  };

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", value);
    router.push(`/app/settings/categories?${params.toString()}`);
  };

  return (
    <>
      <Tabs
        onValueChange={handleTabChange}
        defaultValue={searchParams.get("type") || "expense"}
      >
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
            />
          </TabsContent>

          <TabsContent value="expense">
            <CategorySection
              type="expense"
              selected={selected}
              onToggle={toggleSelect}
              onEdit={handleEdit}
            />
          </TabsContent>
        </div>
      </Tabs>

      <CategoryForm
        type={searchParams.get("type") as "income" | "expense"}
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
        selectedCount={selected.length}
        onClear={() => setSelected([])}
      >
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Delete selected categories"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={selected.length === 0}
        >
          <Trash2 className="size-4" />
        </TooltipButton>
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Merge selected categories"
          onClick={() => setMergeDialogOpen(true)}
          disabled={selected.length < 2 || !selectedType}
        >
          <Combine className="size-4" />
        </TooltipButton>
      </BulkActions>
    </>
  );
}
