"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import Color from "@/components/shared/color";
import LabelForm from "@/components/shared/label-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base font-medium">Labels</CardTitle>
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <LabelForm
          open={open}
          onOpenChange={setOpen}
          onSuccess={handleClose}
          label={editLabel}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20px]"></TableHead>
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
                <TableCell className="w-[20px]">
                  <Color size="sm" color={label.color} />
                </TableCell>
                <TableCell>{label.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
