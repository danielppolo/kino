import React from "react";
import { Button } from "../ui/button";
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
      <div className="bg-background flex gap-2 rounded-full border px-4 py-2 shadow">
        {children}
        <Button size="sm" variant="ghost" onClick={onClear}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
