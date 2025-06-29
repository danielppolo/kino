"use client";

import { useMemo } from "react";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
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
    <div className="space-y-4">
      <Table>
        <TableBody>
          {filteredTemplates.map((tpl) => (
            <TableRow
              key={tpl.id}
              onClick={() => onEdit(tpl)}
              className="cursor-pointer"
            >
              <TableCell>{tpl.name}</TableCell>
              <TableCell>{tpl.type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
