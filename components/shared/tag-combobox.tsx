import React from "react";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useTags } from "@/hooks/use-tags";

interface TagComboboxProps {
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const TagCombobox = ({
  size = "default",
  variant = "outline",
  value,
  onChange,
  placeholder = "Select tag...",
  className,
}: TagComboboxProps) => {
  const { data: tags = [] } = useTags();

  const options: ComboboxOption[] = tags
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((tag) => ({
      value: tag.title,
      label: tag.title,
      keywords: [tag.title.toLowerCase(), tag.group ?? ""],
    }));

  return (
    <Combobox
      variant={variant}
      size={size}
      options={options}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default TagCombobox;
