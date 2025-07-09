"use client";

import { useRouter } from "next/navigation";

import EmptyState from "@/components/shared/empty-state";
import ViewRow from "@/components/shared/view-row";
import { useViews } from "@/contexts/settings-context";
import { View } from "@/utils/supabase/types";

interface ViewsSectionProps {
  selected: string[];
  onToggle: (view: View, shiftKey: boolean) => void;
}

export default function ViewsSection({
  selected,
  onToggle,
}: ViewsSectionProps) {
  const [views] = useViews();
  const router = useRouter();

  if (views.length === 0) {
    return (
      <EmptyState
        title="No views found"
        description="Please try again or add a new view."
      />
    );
  }

  return views.map((view) => {
    const isSelected = selected.includes(view.id);
    return (
      <ViewRow
        key={view.id}
        view={view}
        onClick={(e) => router.push(`/app/transactions?${view.query_params}`)}
        selected={isSelected}
        selectionMode={selected.length > 0}
        onToggleSelect={(e) => onToggle(view, e.shiftKey)}
      />
    );
  });
}
