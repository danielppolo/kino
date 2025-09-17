"use client";

import { ChevronDown } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "../ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Money } from "@/components/ui/money";
import { useCurrency } from "@/contexts/settings-context";
import useFilters from "@/hooks/use-filters";
import { createClient } from "@/utils/supabase/client";
import { getCashflowBreakdown } from "@/utils/supabase/queries";

export default function TransactionTotal() {
  const filters = useFilters();
  const { baseCurrency } = useCurrency();

  // Check if there are any active filters (excluding wallet_id which is always present)
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (
      key === "wallet_id" ||
      key === "page" ||
      key === "pageSize" ||
      key === "sort" ||
      key === "sortOrder"
    ) {
      return false; // These are not considered active filters
    }
    return value && value.toString().trim() !== "";
  });

  const { data: cashflowData } = useQuery({
    queryKey: ["cashflow-breakdown", filters],
    queryFn: async () => {
      const supabase = createClient();
      // Convert empty strings to undefined for the query
      const queryFilters = {
        wallet_id: filters.wallet_id || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        label_id: filters.label_id || undefined,
        category_id: filters.category_id || undefined,
        tag: filters.tag || undefined,
        type: filters.type || undefined,
        transfer_id: filters.transfer_id || undefined,
        description: filters.description || undefined,
        id: filters.id || undefined,
      };
      const result = await getCashflowBreakdown(supabase, queryFilters);
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    enabled: hasActiveFilters, // Only enable the query when there are active filters
  });

  // Don't show anything if there are no active filters
  if (!hasActiveFilters || !cashflowData) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Badge variant="outline" className="hover:bg-accent h-6 cursor-pointer">
          <Money
            cents={cashflowData.total_cashflow || 0}
            currency={baseCurrency}
          />
          <ChevronDown className="ml-1 h-3 w-3" />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-default">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Cashflow</span>
            <Money
              cents={cashflowData.total_cashflow || 0}
              currency={baseCurrency}
            />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-default">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Expenses</span>
            <Money
              cents={cashflowData.total_expenses || 0}
              currency={baseCurrency}
            />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-default">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Incomes</span>
            <Money
              cents={cashflowData.total_incomes || 0}
              currency={baseCurrency}
            />
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
