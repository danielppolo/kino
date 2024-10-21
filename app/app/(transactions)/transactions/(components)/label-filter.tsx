"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import Label from "@/components/shared/label";
import LabelPicker from "@/components/shared/label-picker";
import { Button } from "@/components/ui/button";
import { useLabels } from "@/contexts/settings-context";

const LabelFilter = () => {
  const router = useRouter();
  const [, labelsMap] = useLabels();
  const searchParams = useSearchParams();
  const labelId = searchParams.get("label_id") ?? undefined;
  const label = !!labelId && labelsMap.get(labelId);

  const setLabelId = (id: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("label_id", id);
    } else {
      params.delete("label_id");
    }
    router.push(`/app/transactions?${params.toString()}`);
  };

  if (label) {
    return (
      <Button
        variant="ghost"
        className="peer group"
        size="sm"
        onClick={() => setLabelId(undefined)}
      >
        <div className="group-hover:hidden flex items-center">
          <Label label={label} size="sm" />
        </div>
        <X className="hidden h-3 w-3 group-hover:block" />
      </Button>
    );
  }

  return (
    <LabelPicker onChange={setLabelId} defaultValue={labelId} value={labelId} />
  );
};

export default LabelFilter;
