"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import DeleteViewsDialog from "./(components)/delete-views-dialog";
import ViewsSection from "./(components)/views-section";

import { Button } from "@/components/ui/button";
import { Title } from "@/components/ui/typography";
import { View } from "@/utils/supabase/types";

export default function Page() {
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const toggleSelect = (view: View) => {
    setSelected((prev) =>
      prev.includes(view.id) ? prev.filter((id) => id !== view.id) : [...prev, view.id],
    );
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    setSelected([]);
  };

  return (
    <div>
      <div className="bg-background sticky top-0 flex items-center justify-between py-6">
        <Title>Views</Title>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <ViewsSection selected={selected} onToggle={toggleSelect} />

      <DeleteViewsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selected={selected}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
