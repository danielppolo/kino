"use client";

import { useMemo } from "react";

import TemplateRow from "@/components/shared/template-row";
import { useTemplates } from "@/contexts/settings-context";
import { TransactionTemplate } from "@/utils/supabase/types";

interface TemplatesSectionProps {
  type: "income" | "expense";
  onEdit: (template: TransactionTemplate) => void;
}

export default function TemplatesSection({
  type,
  onEdit,
}: TemplatesSectionProps) {
  const [templates] = useTemplates();

  const filteredTemplates = useMemo(() => {
    return templates
      .filter((template) => template.type === type)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, type]);

  return (
    <div className="divide-y">
      {filteredTemplates.map((tpl) => (
        <TemplateRow key={tpl.id} template={tpl} onClick={() => onEdit(tpl)} />
      ))}
    </div>
  );
}
