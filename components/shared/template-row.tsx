import React, { memo } from "react";
import SelectableRow from "./selectable-row";
import { TransactionTemplate } from "@/utils/supabase/types";
import { Text } from "../ui/typography";

interface TemplateRowProps {
  template: TransactionTemplate;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function TemplateRow({
  template,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
}: TemplateRowProps) {
  return (
    <SelectableRow
      id={template.id}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
    >
      <Text className="shrink grow truncate">{template.name}</Text>
    </SelectableRow>
  );
}

export function TemplateRowLoading() {
  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <div className="bg-muted h-4 w-4 animate-pulse rounded-full" />
      <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      <div className="bg-muted h-4 w-16 animate-pulse rounded" />
    </div>
  );
}

export default memo(
  TemplateRow,
  (prevProps, nextProps) =>
    prevProps.template.id === nextProps.template.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode,
);
