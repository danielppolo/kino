"use client";

import React, { memo } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  return (
    <SelectableRow
      id={category.id}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
    >
      <Text className="shrink-0 truncate">{category.name}</Text>
      <Text className="text-muted-foreground shrink-0 grow text-xs">
        {Array.isArray(category.keywords) ? category.keywords.join(", ") : ""}
      </Text>
      <div className="shrink-0">
        {!!transactionCount && (
          <Badge
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/app/transactions?category_id=${category.id}`);
            }}
            className="h-5 min-w-5 rounded-full px-2 font-mono text-xs font-light tabular-nums"
            variant="outline"
          >
            {transactionCount}
          </Badge>
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
