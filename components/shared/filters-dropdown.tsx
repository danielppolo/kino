"use client";

import { SlidersHorizontal } from "lucide-react";

import CategoryFilter from "@/app/app/(transactions)/transactions/(components)/category-filter";
import DateRangeFilter from "@/app/app/(transactions)/transactions/(components)/date-range-filter";
import LabelFilter from "@/app/app/(transactions)/transactions/(components)/label-filter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FiltersDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <div className="p-2">
            <DateRangeFilter />
          </div>
          <div className="p-2">
            <LabelFilter />
          </div>
          <div className="p-2">
            <CategoryFilter />
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
