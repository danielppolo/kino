"use client";

import { CircleDashed, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Label from "./label";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLabels } from "@/contexts/settings-context";
import useLabelDictionary from "@/hooks/useLabelDictionary";

const LabelFilter = () => {
  const router = useRouter();
  const labels = useLabels();
  const labelsDict = useLabelDictionary(labels);
  const searchParams = useSearchParams();
  const labelId = searchParams.get("label_id") ?? undefined;

  const setLabelId = (id: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("label_id", id);
    } else {
      params.delete("label_id");
    }
    router.push(`/transactions?${params.toString()}`);
  };
  if (labelId && labelsDict[labelId]) {
    return (
      <Button
        variant="ghost"
        className="peer group"
        size="sm"
        onClick={() => setLabelId(undefined)}
      >
        <div className="group-hover:hidden flex items-center">
          <Label label={labelsDict[labelId]} size="sm" />
        </div>
        <X className="hidden h-3 w-3 group-hover:block" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <CircleDashed className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
        <ToggleGroup
          type="single"
          value={labelId}
          onValueChange={setLabelId}
          className="grid grid-cols-8"
        >
          {labels?.map((label) => (
            <ToggleGroupItem key={label.id} value={label.id} size="sm">
              <Label label={label} size="sm" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  );
};

export default LabelFilter;
