"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import TemplatesSection from "./(components)/templates-section";

import TemplateForm from "@/components/shared/template-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Title } from "@/components/ui/typography";
import { useTemplates } from "@/contexts/settings-context";
import { TransactionTemplate } from "@/utils/supabase/types";

export default function Page() {
  const [templates] = useTemplates();
  const [open, setOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<TransactionTemplate>();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", value);
    router.push(`/app/settings/templates?${params.toString()}`);
  };

  const currentType =
    (searchParams.get("type") as "income" | "expense") || "expense";

  return (
    <div>
      <Tabs onValueChange={handleTabChange} defaultValue={currentType}>
        <div className="bg-background sticky top-0 z-10 flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Title>Templates</Title>
            <TabsList>
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleAdd}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="income">
          <TemplatesSection type="income" onEdit={handleEdit} />
        </TabsContent>

        <TabsContent value="expense">
          <TemplatesSection type="expense" onEdit={handleEdit} />
        </TabsContent>
      </Tabs>

      <TemplateForm
        type={currentType}
        template={editTemplate}
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
      />
    </div>
  );
}
