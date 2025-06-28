"use client";

import { useEffect, useState } from "react";
import { Combine, Plus } from "lucide-react";
import Link from "next/link";

import MergeCategoriesDialog from "./merge-categories-dialog";

import CategoryForm from "@/components/shared/category-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getCategoryTransactionCounts } from "@/utils/supabase/queries";
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
  const [transactionCounts, setTransactionCounts] = useState<
    Map<string, number>
  >(new Map());

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

  // Fetch transaction counts
  useEffect(() => {
    const fetchTransactionCounts = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await getCategoryTransactionCounts(supabase, {
          type,
        });

        if (error) {
          console.error("Error fetching transaction counts:", error);
          return;
        }

        const countsMap = new Map<string, number>();
        data?.forEach((item) => {
          countsMap.set(item.category_id, item.transaction_count);
        });

        setTransactionCounts(countsMap);
      } catch (error) {
        console.error("Error fetching transaction counts:", error);
      }
    };

    fetchTransactionCounts();
  }, [type]);

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
    <div className="my-8">
      <div className="flex flex-row items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setMergeDialogOpen(true)}
            disabled={selected.length < 2 || !selectedType}
          >
            <Combine className="size-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={handleAdd}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-4">
              <span className="sr-only">Select</span>
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Keywords</TableHead>
            <TableHead className="w-20">Transactions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCategories?.map((category) => {
            const isSelected = selected.includes(category.id);
            const transactionCount = transactionCounts.get(category.id) || 0;
            return (
              <TableRow
                key={category.id}
                data-state={isSelected ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => handleEdit(category)}
              >
                <TableCell className="w-4" onClick={(e) => e.stopPropagation()}>
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
                <TableCell>
                  {!!transactionCount && (
                    <Link href={`/app/transactions?category_id=${category.id}`}>
                      <Badge
                        className="h-5 min-w-5 rounded-full px-2 font-mono text-xs font-light tabular-nums"
                        variant="outline"
                      >
                        {transactionCount}
                      </Badge>
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
    </div>
  );
}
