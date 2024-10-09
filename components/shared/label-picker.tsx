"use client";

import { CircleDashed } from "lucide-react";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Label from "./label";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useLabelDictionary from "@/hooks/useLabelDictionary";
import { createClient } from "@/utils/supabase/client";
import { listLabels } from "@/utils/supabase/queries";

interface LabelPickerProps {
  defaultValue?: string;
  value?: string;
  onChange: (id: string) => void;
}

const supabase = createClient();

const LabelPicker = ({ onChange, defaultValue, value }: LabelPickerProps) => {
  const { data: labels } = useQuery(listLabels(supabase));
  const labelsDict = useLabelDictionary();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          {value && labelsDict[value] ? (
            <>
              <Label label={labelsDict[value]} size="sm" />
            </>
          ) : (
            <CircleDashed className="w-3 h-3" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
        <ToggleGroup
          type="single"
          defaultValue={defaultValue}
          onValueChange={onChange}
          className="grid grid-cols-8 gap-2 p-2"
        >
          {labels?.map((label) => (
            <ToggleGroupItem key={label.id} value={label.id}>
              <Label label={label} size="sm" />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  );
};

export default LabelPicker;
