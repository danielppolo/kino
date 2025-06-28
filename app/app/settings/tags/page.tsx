"use client";

import { useState } from "react";
import { Combine, Plus, Trash2 } from "lucide-react";

import TagsSection from "./(components)/tags-section";
import DeleteTagsDialog from "./(components)/delete-tags-dialog";
import MergeTagsDialog from "./(components)/merge-tags-dialog";

import TagForm from "@/components/shared/tag-form";
import { Button } from "@/components/ui/button";
import { Title } from "@/components/ui/typography";
import { useTags } from "@/contexts/settings-context";
import { Tag } from "@/utils/supabase/types";

export default function Page() {
  const [tags] = useTags();
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);

  const toggleSelect = (tag: Tag) => {
    setSelected((prev) =>
      prev.includes(tag.id)
        ? prev.filter((id) => id !== tag.id)
        : [...prev, tag.id],
    );
  };

  const handleAdd = () => {
    setSelectedTag(null);
    setOpen(true);
  };

  const handleEdit = (tag: Tag) => {
    setSelectedTag(tag);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedTag(null);
  };

  const handleMergeSuccess = () => {
    setMergeDialogOpen(false);
    setSelected([]);
  };

  const handleDeleteSuccess = () => {
    setDeleteDialogOpen(false);
    setSelected([]);
  };

  return (
    <div>
      <div className="bg-background sticky top-0 z-10 flex items-center justify-between py-6">
        <Title>Tags</Title>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={selected.length === 0}
              >
                <Trash2 className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMergeDialogOpen(true)}
                disabled={selected.length < 2}
              >
                <Combine className="size-4" />
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <TagsSection selected={selected} onToggle={toggleSelect} onEdit={handleEdit} />

      <TagForm
        open={open}
        onOpenChange={handleClose}
        onSuccess={handleClose}
        tag={selectedTag ?? undefined}
      />
      <MergeTagsDialog
        open={mergeDialogOpen}
        onOpenChange={setMergeDialogOpen}
        selected={selected}
        onSuccess={handleMergeSuccess}
      />
      <DeleteTagsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        selected={selected}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
