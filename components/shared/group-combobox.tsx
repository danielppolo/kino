import React from "react";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useTags } from "@/contexts/settings-context";

interface GroupComboboxProps {
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const GroupCombobox = ({
  size = "default",
  variant = "outline",
  value,
  onChange,
  placeholder = "Select group...",
  className,
}: GroupComboboxProps) => {
  const [tags] = useTags();

  // Extract unique groups from tags, filter out null/empty values, and sort
  const uniqueGroups = React.useMemo(() => {
    const groups = new Set<string>();
    tags.forEach((tag) => {
      if (tag.group && tag.group.trim()) {
        groups.add(tag.group.trim());
      }
    });
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [tags]);

  const options: ComboboxOption[] = uniqueGroups.map((group) => ({
    value: group,
    label: group,
    keywords: [group.toLowerCase()],
  }));

  return (
    <Combobox
      variant={variant}
      size={size}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      onCreateOption={async (label) => {
        // For groups, we don't need to create anything in the database
        // Just return the new option to be selected
        return {
          value: label,
          label: label,
          keywords: [label.toLowerCase()],
        };
      }}
    />
  );
};

export default GroupCombobox;
