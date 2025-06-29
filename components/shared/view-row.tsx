import React, { memo } from "react";
import SelectableRow from "./selectable-row";
import { View } from "@/utils/supabase/types";

interface ViewRowProps {
  view: View;
  onClick?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
}

export function ViewRow({
  view,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
}: ViewRowProps) {
  return (
    <SelectableRow
      id={view.id}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
    >
      <div className="shrink grow truncate">{view.name}</div>
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
    prevProps.selectionMode === nextProps.selectionMode,
);
