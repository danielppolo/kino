import React, { memo } from "react";
import { Checkbox } from "../ui/checkbox";

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
    <div
      id={id}
      className={`group hover:bg-accent/50 flex h-10 cursor-pointer items-center gap-2 px-4 ${className}`}
      onClick={onClick}
    >
      <div
        className={`mr-2 shrink-0 ${
          selected || selectionMode
            ? "visible"
            : "invisible group-hover:visible"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect?.();
        }}
      >
        <Checkbox checked={selected} aria-label="Select" />
      </div>
      {children}
    </div>
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
