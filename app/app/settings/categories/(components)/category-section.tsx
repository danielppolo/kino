"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import MergeCategoriesDialog from "./merge-categories-dialog";

import CategoryForm from "@/components/shared/category-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Subtitle } from "@/components/ui/typography";
import { useCategories } from "@/contexts/settings-context";
import { Category } from "@/utils/supabase/types";

interface CategoriesProps {
  type: "income" | "expense";
  title: string;
  selected: string[];
  onToggle: (category: Category) => void;
  onMergeSuccess?: () => void;
}

export default function CategorySection({
  type,
  title,
  selected,
  onToggle,
  onMergeSuccess,
}: CategoriesProps) {
  const [categories] = useCategories();
  const [open, setOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const filteredCategories = categories
    .filter((category) => category.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedCategories = selected
    .map((id) => categories.find((c) => c.id === id))
    .filter(Boolean) as Category[];

  const selectedType =
    selectedCategories.length > 0 &&
    selectedCategories.every((c) => c.type === type)
      ? type
      : null;

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
    onMergeSuccess?.();
  };

  return (
    <Card className="my-8">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-medium">
          <Subtitle>{title}</Subtitle>
        </CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMergeDialogOpen(true)}
            disabled={selected.length < 2 || !selectedType}
          >
            Merge Selected
          </Button>
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-4">
                <span className="sr-only">Select</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Keywords</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories?.map((category) => {
              const isSelected = selected.includes(category.id);
              return (
                <TableRow
                  key={category.id}
                  data-state={isSelected ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => handleEdit(category)}
                >
                  <TableCell
                    className="w-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(category)}
                      aria-label="Select category"
                    />
                  </TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>
                    {Array.isArray(category.keywords)
                      ? category.keywords.join(", ")
                      : ""}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <CategoryForm
        type={type}
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
    </Card>
  );
}
