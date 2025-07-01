"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "../ui/badge";

import { Money } from "@/components/ui/money";
import { useCurrency } from "@/contexts/settings-context";
import useFilters from "@/hooks/use-filters";
import { createClient } from "@/utils/supabase/client";
import { type Filters, getTransactionTotal } from "@/utils/supabase/queries";

export default function TransactionTotal() {
  const filters = useFilters();
  const { conversionRates, baseCurrency } = useCurrency();

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

  const { data: total } = useQuery({
    queryKey: ["transaction-total", filters, conversionRates, baseCurrency],
    queryFn: async () => {
      const supabase = createClient();
      // Convert empty strings to undefined for the query
      const queryFilters: Filters & {
        conversionRates?: Record<string, { rate: number } | any>;
        baseCurrency?: string;
      } = {
        wallet_id: (filters as any).wallet_id || undefined,
        from: (filters as any).from || undefined,
        to: (filters as any).to || undefined,
        label_id: (filters as any).label_id || undefined,
        category_id: (filters as any).category_id || undefined,
        tag: (filters as any).tag || undefined,
        type: (filters as any).type || undefined,
        transfer_id: (filters as any).transfer_id || undefined,
        description: (filters as any).description || undefined,
        id: (filters as any).id || undefined,
        conversionRates,
        baseCurrency,
      };
      const result = await getTransactionTotal(supabase, queryFilters);
      if (result.error) {
        throw result.error;
      }
      return result.data;
    },
    enabled: hasActiveFilters, // Only enable the query when there are active filters
  });

  // Don't show anything if there are no active filters
  if (!hasActiveFilters || !total) {
    return null;
  }

  return (
    <Badge variant="outline" className="h-6">
      <Money cents={total || 0} currency={baseCurrency} />
    </Badge>
  );
}
