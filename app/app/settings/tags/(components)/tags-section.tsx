"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import BulkCategoryChangeDialog from "./bulk-category-change-dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SelectableRow from "@/components/shared/selectable-row";
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
    <div className="space-y-1">
      {tags.map((tag) => {
        const isSelected = selected.includes(tag.id);
        const transactionCount = transactionCountsData?.get(tag.id) || 0;

        return (
          <SelectableRow
            key={tag.id}
            id={tag.id}
            selected={isSelected}
            onToggleSelect={() => onToggle(tag)}
            onClick={() => onEdit(tag)}
          >
            <div className="flex flex-1 items-center justify-between">
              <div className="flex flex-1 items-center gap-4">
                <span className="font-medium">{tag.title}</span>
                <span className="text-muted-foreground text-sm">
                  {tag.group}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!!transactionCount && (
                  <Badge
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/app/transactions?tag=${tag.id}`);
                    }}
                    className="h-5 min-w-5 cursor-pointer rounded-full px-2 font-mono text-xs font-light tabular-nums"
                    variant="outline"
                  >
                    {transactionCount}
                  </Badge>
                )}

                {!!transactionCount && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBulkChangeDialog({
                        tag,
                        transactionCount,
                      });
                    }}
                  >
                    Change Category
                  </Button>
                )}
              </div>
            </div>
          </SelectableRow>
        );
      })}

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
