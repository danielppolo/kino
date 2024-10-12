"use client";

import { useState } from "react";
import { CircleDashed } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Label from "./label";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLabels } from "@/contexts/settings-context";

interface LabelPickerProps {
  defaultValue?: string;
  value?: string | null;
  onChange: (id: string) => void;
}

const LabelPicker = ({ onChange, defaultValue, value }: LabelPickerProps) => {
  const [open, setOpen] = useState(false);
  const [labels, labelsDict] = useLabels();

  const handleChange = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          onValueChange={handleChange}
          className="grid grid-cols-8"
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
