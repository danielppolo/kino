import React, { memo } from "react";
import Color from "./color";
import SelectableRow from "./selectable-row";
import { Label as LabelType } from "@/utils/supabase/types";
import { Text } from "../ui/typography";

interface LabelRowProps {
  label: LabelType;
  onClick?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
}

export function LabelRow({
  label,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
}: LabelRowProps) {
  return (
    <SelectableRow
      id={label.id}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
    >
      <div className="shrink-0">
        <Color size="sm" color={label.color} />
      </div>
      <Text className="shrink grow truncate">{label.name}</Text>
    </SelectableRow>
  );
}

export function LabelRowLoading() {
  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <div className="bg-muted h-4 w-4 animate-pulse rounded-full" />
      <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
    </div>
  );
}

export default memo(
  LabelRow,
  (prevProps, nextProps) =>
    prevProps.label.id === nextProps.label.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode,
);
