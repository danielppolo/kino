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
import EmptyState from "@/components/shared/empty-state";
import RowGroupHeader from "@/components/shared/row-group-header";
import { useKeyboardListNavigation } from "@/hooks/use-keyboard-list-navigation";

interface TagsSectionProps {
  selected: string[];
  onToggle: (tag: Tag, shiftKey: boolean) => void;
  onEdit: (tag: Tag) => void;
  onTransactionCountsLoaded?: (counts: Map<string, number>) => void;
  selectAll: () => void;
}

export default function TagsSection({
  selected,
  onToggle,
  onEdit,
  onTransactionCountsLoaded,
  selectAll,
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

  // Group tags by their group property
  const groups: Record<string, Tag[]> = {};

  tags.forEach((tag) => {
    const group = tag.group || "";
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(tag);
  });

  // Sort tags within each group by title
  Object.values(groups).forEach((groupTags) => {
    groupTags.sort((a, b) => a.title.localeCompare(b.title));
  });

  // Sort groups alphabetically
  const sortedGroups: Record<string, Tag[]> = {};
  Object.keys(groups)
    .sort((a, b) => a.localeCompare(b))
    .forEach((groupName) => {
      sortedGroups[groupName] = groups[groupName];
    });

  const groupedTags = sortedGroups;

  const orderedTags = Object.values(groupedTags).flatMap((groupTags) => groupTags);

  const { activeId, setActiveId } = useKeyboardListNavigation({
    items: orderedTags,
    getItemId: (tag) => tag.id,
    onEnter: onEdit,
    onSpace: (tag) => onToggle(tag, false),
    onSelectAll: selectAll,
  });

  if (tags.length === 0) {
    return (
      <EmptyState title="No tags" description="Create a tag to get started" />
    );
  }

  return (
    <div className="space-y-1">
      {Object.entries(groupedTags).map(([groupName, groupTags]) => (
        <div key={groupName}>
          <RowGroupHeader
            title={groupName.charAt(0).toUpperCase() + groupName.slice(1)}
          />
          {groupTags.map((tag) => {
            const isSelected = selected.includes(tag.id);
            const transactionCount = transactionCountsData?.get(tag.id) || 0;

            return (
              <SelectableRow
                key={tag.id}
                id={`${tag.id}-${transactionCount}`}
                selected={isSelected}
                onToggleSelect={(e) => onToggle(tag, e.shiftKey)}
                onClick={() => {
                  setActiveId(tag.id);
                  onEdit(tag);
                }}
                active={tag.id === activeId}
              >
                <div className="flex flex-1 items-center justify-between">
                  <div className="flex flex-1 items-center gap-4">
                    <Text>{tag.title}</Text>
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
      ))}
    </div>
  );
}
