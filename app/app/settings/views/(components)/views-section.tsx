"use client";

import { useRouter } from "next/navigation";

import ViewRow from "@/components/shared/view-row";
import { useViews } from "@/contexts/settings-context";
import { View } from "@/utils/supabase/types";

interface ViewsSectionProps {
  selected: string[];
  onToggle: (view: View) => void;
}

export default function ViewsSection({
  selected,
  onToggle,
}: ViewsSectionProps) {
  const [views] = useViews();
  const router = useRouter();

  return (
    <div className="divide-y">
      {views.map((view) => {
        const isSelected = selected.includes(view.id);
        return (
          <ViewRow
            key={view.id}
            view={view}
            onClick={() =>
              router.push(`/app/transactions?${view.query_params}`)
            }
            selected={isSelected}
            selectionMode={selected.length > 0}
            onToggleSelect={() => onToggle(view)}
          />
        );
      })}
    </div>
  );
}
