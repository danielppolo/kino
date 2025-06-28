"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import Color from "@/components/shared/color";
import LabelForm from "@/components/shared/label-form";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Title } from "@/components/ui/typography";
import { useLabels } from "@/contexts/settings-context";
import { COLORS } from "@/utils/constants";
import { Database } from "@/utils/supabase/database.types";

export default function LabelSection() {
  const [open, setOpen] = useState(false);
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
    <div className="space-y-4">
      <div className="bg-background sticky top-0 flex items-center justify-between py-6">
        <Title>Labels</Title>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
      <Table>
        <TableBody>
          {sortedLabels?.map((label) => (
            <TableRow
              key={label.id}
              onClick={() => handleEdit(label)}
              className="cursor-pointer"
            >
              <TableCell className="w-[20px]">
                <Color size="sm" color={label.color} />
              </TableCell>
              <TableCell>{label.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <LabelForm
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
        label={editLabel}
      />
    </div>
  );
}
