"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import TemplateForm from "@/components/shared/template-form";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Title } from "@/components/ui/typography";
import { useTemplates } from "@/contexts/settings-context";
import { TransactionTemplate } from "@/utils/supabase/types";

export default function TemplatesSection() {
  const [open, setOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<TransactionTemplate>();
  const [templates] = useTemplates();

  const handleAdd = () => {
    setEditTemplate(undefined);
    setOpen(true);
  };

  const handleEdit = (template: TransactionTemplate) => {
    setEditTemplate(template);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditTemplate(undefined);
  };

  const sorted = [...templates].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="bg-background sticky top-0 flex items-center justify-between py-6">
        <Title>Templates</Title>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
      <Table>
        <TableBody>
          {sorted.map((tpl) => (
            <TableRow
              key={tpl.id}
              onClick={() => handleEdit(tpl)}
              className="cursor-pointer"
            >
              <TableCell>{tpl.name}</TableCell>
              <TableCell>{tpl.type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TemplateForm
        type={editTemplate?.type || "expense"}
        template={editTemplate}
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
      />
    </div>
  );
}
