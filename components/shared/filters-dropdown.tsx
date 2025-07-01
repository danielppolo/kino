"use client";

import { SlidersHorizontal } from "lucide-react";

import CategoryFilter from "@/app/app/(transactions)/transactions/(components)/category-filter";
import DateRangeFilter from "@/app/app/(transactions)/transactions/(components)/date-range-filter";
import DescriptionFilter from "@/app/app/(transactions)/transactions/(components)/description-filter";
import LabelFilter from "@/app/app/(transactions)/transactions/(components)/label-filter";
import TagFilter from "@/app/app/(transactions)/transactions/(components)/tag-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipButton } from "@/components/ui/tooltip-button";

export function FiltersDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TooltipButton variant="ghost" size="sm" tooltip="Filters">
          <SlidersHorizontal className="h-4 w-4" />
        </TooltipButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <div className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50">
            <DateRangeFilter />
          </div>
          <div className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50">
            <LabelFilter />
          </div>
          <div className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50">
            <CategoryFilter />
          </div>
          <div className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50">
            <DescriptionFilter />
          </div>
          <div className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-50">
            <TagFilter />
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
