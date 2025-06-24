"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import TagForm from "@/components/shared/tag-form";
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
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base font-medium">Tags</CardTitle>
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <TagForm
          open={open}
          onOpenChange={setOpen}
          onSuccess={handleClose}
          tag={editTag}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Group</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((tag) => (
              <TableRow
                key={tag.id}
                onClick={() => handleEdit(tag)}
                className="cursor-pointer"
              >
                <TableCell>{tag.title}</TableCell>
                <TableCell>{tag.group}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
