import React, { memo } from "react";
import Link from "next/link";
import { Badge } from "../ui/badge";
import SelectableRow from "./selectable-row";
import { LazyIcon } from "../ui/icon";
import { Category } from "@/utils/supabase/types";
import { Text } from "../ui/typography";

interface CategoryRowProps {
  category: Category;
  onClick?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
  transactionCount?: number;
}

export function CategoryRow({
  category,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  transactionCount = 0,
}: CategoryRowProps) {
  return (
    <SelectableRow
      id={category.id}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
    >
      <div className="shrink-0">
        <LazyIcon name={category.icon} className="h-4 w-4" />
      </div>
      <Text className="shrink grow truncate">{category.name}</Text>
      <div className="text-muted-foreground shrink-0">
        {Array.isArray(category.keywords) ? category.keywords.join(", ") : ""}
      </div>
      <div className="shrink-0">
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
      </div>
    </SelectableRow>
  );
}

export function CategoryRowLoading() {
  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <div className="bg-muted h-4 w-4 animate-pulse rounded-full" />
      <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
      <div className="bg-muted h-4 w-16 animate-pulse rounded" />
    </div>
  );
}

export default memo(
  CategoryRow,
  (prevProps, nextProps) =>
    prevProps.category.id === nextProps.category.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.transactionCount === nextProps.transactionCount,
);
