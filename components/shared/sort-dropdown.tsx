"use client";

import { ArrowUpDown, Calendar, DollarSign } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";

type SortField = "date" | "base_amount_cents";
type SortOrder = "asc" | "desc";

export function SortDropdown() {
  const [filters, setFilters] = useTransactionQueryState();

  const currentSort = (filters.sort as SortField) || "date";
  const currentOrder = (filters.sortOrder as SortOrder) || "desc";

  const updateSort = (field: SortField, order: SortOrder) => {
    setFilters({
      sort: field,
      sortOrder: order,
      page: null,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TooltipButton variant="ghost" size="sm" tooltip="Sort transactions">
          <ArrowUpDown className="h-4 w-4" />
        </TooltipButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="start">
        <DropdownMenuItem
          onClick={() => updateSort("date", "desc")}
          className={
            currentSort === "date" && currentOrder === "desc" ? "bg-accent" : ""
          }
        >
          <Calendar className="mr-2 h-4 w-4" />
          Date (Newest first)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort("date", "asc")}
          className={
            currentSort === "date" && currentOrder === "asc" ? "bg-accent" : ""
          }
        >
          <Calendar className="mr-2 h-4 w-4" />
          Date (Oldest first)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => updateSort("base_amount_cents", "desc")}
          className={
            currentSort === "base_amount_cents" &&
            currentOrder === "desc"
              ? "bg-accent"
              : ""
          }
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Amount (Highest first)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort("base_amount_cents", "asc")}
          className={
            currentSort === "base_amount_cents" && currentOrder === "asc"
              ? "bg-accent"
              : ""
          }
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Amount (Lowest first)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
