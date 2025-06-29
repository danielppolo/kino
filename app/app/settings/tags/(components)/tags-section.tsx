"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import SelectableRow from "@/components/shared/selectable-row";
import { useTags } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getTagTransactionCounts } from "@/utils/supabase/queries";
import { Tag } from "@/utils/supabase/types";
import { Text } from "@/components/ui/typography";

interface TagsSectionProps {
  selected: string[];
  onToggle: (tag: Tag) => void;
  onEdit: (tag: Tag) => void;
  onTransactionCountsLoaded?: (counts: Map<string, number>) => void;
}

export default function TagsSection({
  selected,
  onToggle,
  onEdit,
  onTransactionCountsLoaded,
}: TagsSectionProps) {
  const router = useRouter();
  const [tags] = useTags();

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

  // Pass transaction counts to parent when loaded
  useEffect(() => {
    if (transactionCountsData && onTransactionCountsLoaded) {
      onTransactionCountsLoaded(transactionCountsData);
    }
  }, [transactionCountsData, onTransactionCountsLoaded]);

  return (
    <div className="space-y-1">
      {tags.map((tag) => {
        const isSelected = selected.includes(tag.id);
        const transactionCount = transactionCountsData?.get(tag.id) || 0;

        return (
          <SelectableRow
            key={tag.id}
            id={`${tag.id}-${transactionCount}`}
            selected={isSelected}
            onToggleSelect={() => onToggle(tag)}
            onClick={() => onEdit(tag)}
          >
            <div className="flex flex-1 items-center justify-between">
              <div className="flex flex-1 items-center gap-4">
                <Text>{tag.title}</Text>
                <Text className="text-muted-foreground">{tag.group}</Text>
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
              </div>
            </div>
          </SelectableRow>
        );
      })}
    </div>
  );
}
