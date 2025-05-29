import React from "react";

import Label from "./label";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useLabels } from "@/contexts/settings-context";
import { Label as LabelType } from "@/utils/supabase/types";

interface LabelComboboxProps {
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

const LabelCombobox = ({
  value,
  onChange,
  placeholder = "Select label...",
  className,
}: LabelComboboxProps) => {
  const [labels] = useLabels();

  const options: ComboboxOption[] = labels.map((label) => ({
    value: label.id,
    label: label.name,
    keywords: [label.name.toLowerCase(), label.color ?? ""],
  }));

  const labelMap = React.useMemo(() => {
    const map = new Map<string, LabelType>();
    labels.forEach((l) => map.set(l.id, l));
    return map;
  }, [labels]);

  return (
    <Combobox
      options={options}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      renderValue={(option) => {
        const label = option && labelMap.get(option.value);
        if (label) {
          return (
            <span className="flex items-center gap-2">
              <Label label={label} size="sm" />
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
              <Label label={label} size="sm" />
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
