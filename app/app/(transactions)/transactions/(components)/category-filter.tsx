"use client";

import { useState } from "react";
import { CircleDotDashed, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "../../../../../components/ui/toggle-group";
import Category from "../../../../../components/shared/category";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCategories } from "@/contexts/settings-context";
import { TRANSFER_CATEGORIES } from "@/utils/constants";

const CategoryFilter = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categories, categoriesMap] = useCategories();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category_id") ?? undefined;
  const category = categoryId && categoriesMap.get(categoryId);

  const setCategoryId = (id: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("category_id", id);
    } else {
      params.delete("category_id");
    }
    router.push(`/app/transactions?${params.toString()}`);
    setOpen(false);
  };

  if (category) {
    return (
      <Button
        variant="ghost"
        className="peer group"
        size="sm"
        onClick={() => setCategoryId(undefined)}
      >
        <div className="group-hover:hidden flex items-center">
          <Category category={category} />
        </div>
        <X className="hidden h-3 w-3 group-hover:block" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <CircleDotDashed className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
        <ToggleGroup
          type="single"
          value={categoryId}
          onValueChange={setCategoryId}
          className="grid grid-cols-8"
        >
          {categories?.concat(TRANSFER_CATEGORIES).map((category) => (
            <ToggleGroupItem key={category.id} value={category.id} size="sm">
              <Category category={category} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  );
};

export default CategoryFilter;
