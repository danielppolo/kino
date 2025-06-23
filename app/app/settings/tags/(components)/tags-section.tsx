"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import TagForm from "@/components/shared/tag-form";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTags } from "@/hooks/use-tags";
import { Tag } from "@/utils/supabase/types";

export default function TagsSection() {
  const { data: tags = [] } = useTags();
  const [open, setOpen] = useState(false);
  const [editTag, setEditTag] = useState<Tag | undefined>(undefined);

  const handleAdd = () => {
    setEditTag(undefined);
    setOpen(true);
  };

  const handleEdit = (tag: Tag) => {
    setEditTag(tag);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditTag(undefined);
  };

  const sorted = [...tags].sort((a, b) => {
    const gA = a.group ?? "";
    const gB = b.group ?? "";
    if (gA !== gB) return gA.localeCompare(gB);
    return a.title.localeCompare(b.title);
  });

  return (
    <div>
      <div className="mb-4 flex w-full items-center justify-between">
        <Button size="sm" variant="ghost" onClick={handleAdd}>
          <Plus className="size-4" />
        </Button>
      </div>
      <TagForm open={open} onOpenChange={setOpen} onSuccess={handleClose} tag={editTag} />
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Group</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((tag) => (
              <TableRow key={tag.id} onClick={() => handleEdit(tag)} className="cursor-pointer">
                <TableCell>{tag.title}</TableCell>
                <TableCell>{tag.group}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
