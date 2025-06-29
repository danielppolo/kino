"use client";

import { useState } from "react";
import { BookmarkPlus, Pin } from "lucide-react";

import SaveViewDialog from "./save-view-dialog";
import { Button } from "@/components/ui/button";

export default function SaveViewButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pin className="h-4 w-4" />
      </Button>
      <SaveViewDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
