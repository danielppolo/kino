"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import CategoryForm from "@/components/shared/category-form";
import { Button } from "@/components/ui/button";
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
}

export default function CategorySection({ type, title }: CategoriesProps) {
  const [categories] = useCategories();
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const filteredCategories = categories
    .filter((category) => category.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));

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

  return (
    <div className="my-8">
      <div className="flex items-center justify-between gap-2">
        <Subtitle>{title}</Subtitle>
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="size-4" />
        </Button>
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Keywords</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories?.map((category) => (
              <TableRow
                key={category.id}
                className="cursor-pointer"
                onClick={() => handleEdit(category)}
              >
                <TableCell>{category.name}</TableCell>
                <TableCell>
                  {Array.isArray(category.keywords)
                    ? category.keywords.join(", ")
                    : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <CategoryForm
        type={type}
        category={selectedCategory ?? undefined}
        open={open}
        onOpenChange={handleClose}
        onSuccess={handleClose}
      />
    </div>
  );
}
