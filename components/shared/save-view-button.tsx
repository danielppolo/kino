"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";

import SaveViewDialog from "./save-view-dialog";
import { TooltipButton } from "@/components/ui/tooltip-button";

export default function SaveViewButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TooltipButton
        variant="ghost"
        size="sm"
        tooltip="Save current view"
        onClick={() => setOpen(true)}
      >
        <FolderPlus className="h-4 w-4" />
      </TooltipButton>
      <SaveViewDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
