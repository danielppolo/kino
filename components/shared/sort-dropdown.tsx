"use client";

import { ArrowUpDown, Calendar, DollarSign } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipButton } from "@/components/ui/tooltip-button";

type SortField = "date" | "amount_cents";
type SortOrder = "asc" | "desc";

export function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSort = (searchParams.get("sort") as SortField) || "date";
  const currentOrder = (searchParams.get("sortOrder") as SortOrder) || "desc";

  const updateSort = (field: SortField, order: SortOrder) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", field);
    params.set("sortOrder", order);
    params.delete("page"); // Reset to first page when sorting changes
    router.push(`?${params.toString()}`);
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
          onClick={() => updateSort("amount_cents", "desc")}
          className={
            currentSort === "amount_cents" && currentOrder === "desc"
              ? "bg-accent"
              : ""
          }
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Amount (Highest first)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort("amount_cents", "asc")}
          className={
            currentSort === "amount_cents" && currentOrder === "asc"
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
