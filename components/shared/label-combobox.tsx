import React from "react";

import Color from "./color";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useLabels } from "@/contexts/settings-context";
import { Label as LabelType } from "@/utils/supabase/types";

interface LabelComboboxProps {
  "aria-label"?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
  comboboxVariant?: "icon" | "default";
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  compact?: boolean;
}

const LabelCombobox = ({
  "aria-label": ariaLabel,
  size = "default",
  variant = "outline",
  comboboxVariant = "default",
  value,
  onChange,
  placeholder = "Select label...",
  className,
  icon,
  compact = false,
}: LabelComboboxProps) => {
  const [labels] = useLabels();

  const options: ComboboxOption[] = labels
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((label) => ({
      value: label.id,
      label: label.name,
      keywords: [label.name.toLowerCase(), label.color ?? ""],
    }));

  const labelMap = (() => {
    const map = new Map<string, LabelType>();
    labels.forEach((l) => map.set(l.id, l));
    return map;
  })();

  return (
    <Combobox
      aria-label={ariaLabel}
      variant={variant}
      size={size}
      comboboxVariant={comboboxVariant}
      icon={icon}
      options={options}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      renderValue={(option) => {
        if (compact) return placeholder;
        const label = option && labelMap.get(option.value);
        if (label) {
          return (
            <span className="flex items-center gap-2">
              <Color size="sm" color={label.color} />
              <span>{label.name}</span>
            </span>
          );
        }
        return placeholder;
      }}
      renderOption={(option) => {
        const label = labelMap.get(option.value);
        if (label) {
          return (
            <span className="flex items-center gap-2">
              <Color size="sm" color={label.color} />
              <span>{label.name}</span>
            </span>
          );
        }
        return option.label;
      }}
    />
  );
};

export default LabelCombobox;
