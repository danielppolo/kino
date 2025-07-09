"use client";

import { useMemo } from "react";

import EmptyState from "@/components/shared/empty-state";
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

  if (filteredTemplates.length === 0) {
    return (
      <EmptyState
        title="No templates found"
        description="Please try again or add a new template."
      />
    );
  }

  return filteredTemplates.map((tpl) => (
    <TemplateRow key={tpl.id} template={tpl} onClick={(e) => onEdit(tpl)} />
  ));
}
