"use client";

import { useState } from "react";
import { CircleDashed } from "lucide-react";

import { DrawerPopover } from "../ui/drawer-popover";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Label from "./label";

import { Button } from "@/components/ui/button";
import { useLabels } from "@/contexts/settings-context";

interface LabelPickerProps {
  defaultValue?: string;
  value?: string | null;
  onChange: (id: string) => void;
}

const LabelPicker = ({ onChange, defaultValue, value }: LabelPickerProps) => {
  const [open, setOpen] = useState(false);
  const [labels, labelsMap] = useLabels();
  const label = !!value && labelsMap.get(value);

  const handleChange = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <DrawerPopover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="sm">
          {label ? (
            <Label label={label} size="sm" />
          ) : (
            <CircleDashed className="w-3 h-3" />
          )}
        </Button>
      }
    >
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
    </DrawerPopover>
  );
};

export default LabelPicker;
