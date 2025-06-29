"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import BulkCategoryChangeDialog from "./bulk-category-change-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const [tags] = useTags();
  const [bulkChangeDialog, setBulkChangeDialog] = useState<{
    tag: Tag;
    transactionCount: number;
  } | null>(null);

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
          {tags.map((tag) => {
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
                    <Badge
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/app/transactions?tag=${tag.id}`);
                      }}
                      className="h-5 min-w-5 rounded-full px-2 font-mono text-xs font-light tabular-nums"
                      variant="outline"
                    >
                      {transactionCount}
                    </Badge>
                  )}
                </TableCell>
                <TableCell
                  className="w-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!!transactionCount && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setBulkChangeDialog({
                          tag,
                          transactionCount,
                        });
                      }}
                    >
                      Change Category
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {bulkChangeDialog && (
        <BulkCategoryChangeDialog
          tag={bulkChangeDialog.tag}
          transactionCount={bulkChangeDialog.transactionCount}
          open={!!bulkChangeDialog}
          onOpenChange={(open) => {
            if (!open) {
              setBulkChangeDialog(null);
            }
          }}
        />
      )}
    </div>
  );
}
