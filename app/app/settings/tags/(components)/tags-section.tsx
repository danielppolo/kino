"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useTags } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getTagTransactionCounts } from "@/utils/supabase/queries";
import { Tag } from "@/utils/supabase/types";

interface TagsSectionProps {
  selected: string[];
  onToggle: (tag: Tag) => void;
  onEdit: (tag: Tag) => void;
}

export default function TagsSection({
  selected,
  onToggle,
  onEdit,
}: TagsSectionProps) {
  const [tags] = useTags();

  const sorted = [...tags].sort((a, b) => {
    const gA = a.group ?? "";
    const gB = b.group ?? "";
    if (gA !== gB) return gA.localeCompare(gB);
    return a.title.localeCompare(b.title);
  });

  // Fetch transaction counts using react-query
  const { data: transactionCountsData } = useQuery({
    queryKey: ["tag-transaction-counts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getTagTransactionCounts(supabase);

      if (error) {
        throw error;
      }

      // Convert array to Map for easier lookup
      const countsMap = new Map<string, number>();
      data?.forEach((item) => {
        countsMap.set(item.tag_id, item.transaction_count);
      });

      return countsMap;
    },
  });

  return (
    <div className="space-y-4">
      <Table>
        <TableBody>
          {sorted.map((tag) => {
            const isSelected = selected.includes(tag.id);
            const transactionCount = transactionCountsData?.get(tag.id) || 0;
            return (
              <TableRow
                key={tag.id}
                data-state={isSelected ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => onEdit(tag)}
              >
                <TableCell className="w-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggle(tag)}
                    aria-label="Select tag"
                  />
                </TableCell>
                <TableCell>{tag.title}</TableCell>
                <TableCell>{tag.group}</TableCell>
                <TableCell>
                  {!!transactionCount && (
                    <Link href={`/app/transactions?tag=${tag.id}`}>
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
