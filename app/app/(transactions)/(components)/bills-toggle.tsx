"use client";

import { Receipt } from "lucide-react";
import { useParams } from "next/navigation";

import { TooltipButton } from "@/components/ui/tooltip-button";

interface BillsToggleProps {
  onOpenSheet: () => void;
}

function BillsToggle({ onOpenSheet }: BillsToggleProps) {
  const { walletId } = useParams();

  if (!walletId) return null;

  return (
    <TooltipButton
      size="sm"
      variant="ghost"
      tooltip="View bills"
      onClick={onOpenSheet}
    >
      <Receipt className="size-4" />
    </TooltipButton>
  );
}

export default BillsToggle;
