import React, { memo } from "react";

import { Checkbox } from "../ui/checkbox";
import Row from "../ui/row";

import { cn } from "@/lib/utils";

interface SelectableRowProps {
  id: string;
  onClick?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SelectableRow({
  id,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  children,
  className = "",
}: SelectableRowProps) {
  return (
    <Row
      id={id}
      className={cn(selected && "pl-10", className)}
      onClick={onClick}
    >
      <div
        className={`from-background absolute left-0 flex h-full shrink-0 items-center bg-gradient-to-r to-transparent px-4 pr-6 ${
          selected ? "visible" : "invisible group-hover:visible"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect?.();
        }}
      >
        <Checkbox checked={selected} aria-label="Select" />
      </div>
      {children}
    </Row>
  );
}

export function SelectableRowLoading() {
  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <div className="bg-muted h-4 w-4 animate-pulse rounded-full" />
      <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
    </div>
  );
}

export default memo(
  SelectableRow,
  (prevProps, nextProps) =>
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode,
);
