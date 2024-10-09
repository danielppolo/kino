"use client";

import { CircleDashed, X } from "lucide-react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Label from "./label";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFilter } from "@/contexts/filter-context";
import useLabelDictionary from "@/hooks/useLabelDictionary";
import { createClient } from "@/utils/supabase/client";
import { listLabels } from "@/utils/supabase/queries";
import { Label as LabelType } from "@/utils/supabase/types";

interface LabelFilterProps {
  options?: LabelType[];
}
const supabase = createClient();

const LabelFilter = (props: LabelFilterProps) => {
  const {
    filters: { label_id },
    setLabelId,
  } = useFilter();
  const { data: labels } = useQuery(listLabels(supabase));
  const labelsDict = useLabelDictionary();

  if (label_id && labelsDict[label_id]) {
    return (
      <Button
        variant="ghost"
        className="peer group"
        size="sm"
        onClick={() => setLabelId(undefined)}
      >
        <div className="group-hover:hidden flex items-center">
          <Label label={labelsDict[label_id]} size="sm" />
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
          value={label_id}
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
