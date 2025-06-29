"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import DeleteViewsDialog from "./(components)/delete-views-dialog";
import ViewsSection from "./(components)/views-section";

import { BulkActions } from "@/components/shared/bulk-actions";
import { TooltipButton } from "@/components/ui/tooltip-button";
import PageHeader from "@/components/shared/page-header";
import { View } from "@/utils/supabase/types";

export default function Page() {
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const toggleSelect = (view: View) => {
    setSelected((prev) =>
      prev.includes(view.id)
        ? prev.filter((id) => id !== view.id)
        : [...prev, view.id],
    );
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    setSelected([]);
  };

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-4">
          {/* Header content can be added here if needed */}
        </div>
        <div className="flex gap-2">
          {/* Add button can be added here if needed */}
        </div>
      </PageHeader>

      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        <ViewsSection selected={selected} onToggle={toggleSelect} />
      </div>

      <DeleteViewsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selected={selected}
        onSuccess={handleDeleteSuccess}
      />

      <BulkActions
        selectedCount={selected.length}
        onClear={() => setSelected([])}
      >
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Delete selected views"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={selected.length === 0}
        >
          <Trash2 className="size-4" />
        </TooltipButton>
      </BulkActions>
    </>
  );
}
