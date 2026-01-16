import React, { memo } from "react";
import SelectableRow from "./selectable-row";
import { View } from "@/utils/supabase/types";
import { Text } from "../ui/typography";

interface ViewRowProps {
  view: View;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (event: React.MouseEvent<HTMLDivElement>) => void;
  active?: boolean;
}

export function ViewRow({
  view,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  active = false,
}: ViewRowProps) {
  return (
    <SelectableRow
      id={view.id}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      active={active}
    >
      <Text className="shrink grow truncate">{view.name}</Text>
    </SelectableRow>
  );
}

export function ViewRowLoading() {
  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <div className="bg-muted h-4 w-4 animate-pulse rounded-full" />
      <div className="bg-muted h-4 w-24 animate-pulse rounded" />
    </div>
  );
}

export default memo(
  ViewRow,
  (prevProps, nextProps) =>
    prevProps.view.id === nextProps.view.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.active === nextProps.active,
);
