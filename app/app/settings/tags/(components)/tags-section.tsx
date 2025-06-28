"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useTags } from "@/contexts/settings-context";
import { Tag } from "@/utils/supabase/types";

interface TagsSectionProps {
  selected: string[];
  onToggle: (tag: Tag) => void;
  onEdit: (tag: Tag) => void;
}

export default function TagsSection({
  selected,
  onToggle,
  onEdit,
}: TagsSectionProps) {
  const [tags] = useTags();

  const sorted = [...tags].sort((a, b) => {
    const gA = a.group ?? "";
    const gB = b.group ?? "";
    if (gA !== gB) return gA.localeCompare(gB);
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-4">
      <Table>
        <TableBody>
          {sorted.map((tag) => {
            const isSelected = selected.includes(tag.id);
            return (
              <TableRow
                key={tag.id}
                data-state={isSelected ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => onEdit(tag)}
              >
                <TableCell className="w-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggle(tag)}
                    aria-label="Select tag"
                  />
                </TableCell>
                <TableCell>{tag.title}</TableCell>
                <TableCell>{tag.group}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
