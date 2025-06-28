"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useCategories } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getCategoryTransactionCounts } from "@/utils/supabase/queries";
import { Category } from "@/utils/supabase/types";

interface CategoriesProps {
  type: "income" | "expense";
  selected: string[];
  onToggle: (category: Category) => void;
  onEdit: (category: Category) => void;
}

export default function CategorySection({
  type,
  selected,
  onToggle,
  onEdit,
}: CategoriesProps) {
  const [categories] = useCategories();

  const filteredCategories = categories
    .filter((category) => category.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Fetch transaction counts using react-query
  const { data: transactionCountsData } = useQuery({
    queryKey: ["category-transaction-counts", type],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getCategoryTransactionCounts(supabase, {
        type,
      });

      if (error) {
        throw error;
      }

      // Convert array to Map for easier lookup
      const countsMap = new Map<string, number>();
      data?.forEach((item) => {
        countsMap.set(item.category_id, item.transaction_count);
      });

      return countsMap;
    },
  });

  return (
    <div className="space-y-4">
      <Table>
        <TableBody>
          {filteredCategories?.map((category) => {
            const isSelected = selected.includes(category.id);
            const transactionCount =
              transactionCountsData?.get(category.id) || 0;
            return (
              <TableRow
                key={category.id}
                data-state={isSelected ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => onEdit(category)}
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
    </div>
  );
}
