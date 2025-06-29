"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import LabelRow from "@/components/shared/label-row";
import LabelForm from "@/components/shared/label-form";
import { BulkActions } from "@/components/shared/bulk-actions";
import { Button } from "@/components/ui/button";
import { Text, Title } from "@/components/ui/typography";
import { useLabels } from "@/contexts/settings-context";
import { COLORS } from "@/utils/constants";
import { Database } from "@/utils/supabase/database.types";
import PageHeader from "@/components/shared/page-header";

export default function LabelSection() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [editLabel, setEditLabel] = useState<
    Database["public"]["Tables"]["labels"]["Row"] | undefined
  >(undefined);
  const [labels] = useLabels();

  const handleAdd = () => {
    setEditLabel(undefined);
    setOpen(true);
  };

  const handleEdit = (label: Database["public"]["Tables"]["labels"]["Row"]) => {
    setEditLabel(label);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditLabel(undefined);
  };

  const toggleSelect = (
    label: Database["public"]["Tables"]["labels"]["Row"],
  ) => {
    setSelected((prev) => {
      const exists = prev.includes(label.id);
      if (exists) return prev.filter((id) => id !== label.id);
      return [...prev, label.id];
    });
  };

  const sortedLabels = [...labels].sort((a, b) => {
    const aIndex = COLORS.indexOf(a.color);
    const bIndex = COLORS.indexOf(b.color);

    // If both colors are found in the COLORS array, sort by their index
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // If only one color is found, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // If neither color is found, sort alphabetically by name as fallback
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      <PageHeader className="justify-end">
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="size-4" />
        </Button>
      </PageHeader>

      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        <div className="divide-y">
          {sortedLabels?.map((label) => {
            const isSelected = selected.includes(label.id);
            return (
              <LabelRow
                key={label.id}
                label={label}
                onClick={() => handleEdit(label)}
                selected={isSelected}
                selectionMode={selected.length > 0}
                onToggleSelect={() => toggleSelect(label)}
              />
            );
          })}
        </div>
      </div>

      <LabelForm
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
        label={editLabel}
      />

      <BulkActions
        selectedCount={selected.length}
        onClear={() => setSelected([])}
      >
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            // TODO: Implement bulk delete for labels
            console.log("Delete labels:", selected);
          }}
          disabled={selected.length === 0}
        >
          <Trash2 className="size-4" />
        </Button>
      </BulkActions>
    </>
  );
}
