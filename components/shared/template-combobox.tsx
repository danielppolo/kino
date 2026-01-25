import React from "react";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useTemplates } from "@/contexts/settings-context";
import { TransactionTemplate } from "@/utils/supabase/types";
import { StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateComboboxProps {
  type: "income" | "expense";
  onSelect: (template: TransactionTemplate) => void;
  className?: string;
}

const TemplateCombobox = ({
  type,
  onSelect,
  className,
}: TemplateComboboxProps) => {
  const [templates] = useTemplates();
  const filtered = templates.filter((t) => t.type === type);
  const options: ComboboxOption[] = filtered.map((t) => ({
    value: t.id,
    label: t.name,
  }));
  const templateMap = (() => {
    const m = new Map<string, TransactionTemplate>();
    filtered.forEach((t) => m.set(t.id, t));
    return m;
  })();

  const handleChange = (id: string) => {
    const tpl = templateMap.get(id);
    if (tpl) onSelect(tpl);
  };

  return (
    <Combobox
      size="sm"
      variant="outline"
      comboboxVariant="icon"
      options={options}
      value=""
      onChange={handleChange}
      icon={<StickyNote className="size-4" />}
      className={cn("w-auto")}
    />
  );
};

export default TemplateCombobox;
