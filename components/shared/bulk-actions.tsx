import React from "react";
import { TooltipButton } from "../ui/tooltip-button";
import { X } from "lucide-react";

interface BulkActionsProps {
  selectedCount: number;
  onClear: () => void;
  children: React.ReactNode;
}

export function BulkActions({
  selectedCount,
  onClear,
  children,
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div className="bg-background flex gap-2 rounded-xl border p-2 shadow">
        {children}
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Clear selection"
          onClick={onClear}
        >
          <X className="size-4" />
        </TooltipButton>
      </div>
    </div>
  );
}
