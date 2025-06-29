"use client";

import { useRouter } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useViews } from "@/contexts/settings-context";
import { View } from "@/utils/supabase/types";

interface ViewsSectionProps {
  selected: string[];
  onToggle: (view: View) => void;
}

export default function ViewsSection({ selected, onToggle }: ViewsSectionProps) {
  const [views] = useViews();
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Table>
        <TableBody>
          {views.map((view) => {
            const isSelected = selected.includes(view.id);
            return (
              <TableRow
                key={view.id}
                data-state={isSelected ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => router.push(`/app/transactions?${view.query_params}`)}
              >
                <TableCell className="w-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggle(view)}
                    aria-label="Select view"
                  />
                </TableCell>
                <TableCell>{view.name}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
