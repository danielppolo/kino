"use client";

import { CircleDashed } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Label from "./label";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useLabelDictionary from "@/hooks/useLabelDictionary";
import { Label as LabelType } from "@/utils/supabase/types";

interface LabelPickerProps {
  options: LabelType[];
  defaultValue?: string;
  value: string | null;
  onChange: (id: string) => void;
}

const LabelPicker = ({
  options,
  onChange,
  defaultValue,
  value,
}: LabelPickerProps) => {
  const labelsDict = useLabelDictionary(options);

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
          {options?.map((label) => (
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
