"use client";

import React, { memo } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "../ui/badge";
import { Text } from "../ui/typography";
import SelectableRow from "./selectable-row";

import { Category } from "@/utils/supabase/types";

interface CategoryRowProps {
  category: Category;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (event: React.MouseEvent<HTMLDivElement>) => void;
  transactionCount?: number;
  active?: boolean;
}

export function CategoryRow({
  category,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  transactionCount = 0,
  active = false,
}: CategoryRowProps) {
  const router = useRouter();
  return (
    <SelectableRow
      id={category.id}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      active={active}
    >
      <Text className="shrink-0 truncate">{category.name}</Text>
      <Text className="text-muted-foreground shrink-0 grow text-xs">
        {Array.isArray(category.keywords) ? category.keywords.join(", ") : ""}
      </Text>
      {category.type === "expense" && category.is_obligation && (
        <Badge variant="secondary" className="shrink-0">
          Required
        </Badge>
      )}
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
    prevProps.transactionCount === nextProps.transactionCount &&
    prevProps.active === nextProps.active,
);
