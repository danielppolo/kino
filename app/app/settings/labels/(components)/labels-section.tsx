"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import Color from "@/components/shared/color";
import LabelForm from "@/components/shared/label-form";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLabels } from "@/contexts/settings-context";
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

  const sortedLabels = [...labels].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="mb-4 flex w-full items-center justify-between">
        <Button size="sm" variant="ghost" onClick={handleAdd}>
          <Plus className="size-4" />
        </Button>
      </div>
      <LabelForm
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
        label={editLabel}
      />
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLabels?.map((label) => (
              <TableRow
                key={label.id}
                onClick={() => handleEdit(label)}
                className="cursor-pointer"
              >
                <TableCell>
                  <Color size="sm" color={label.color} />
                </TableCell>
                <TableCell>{label.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
