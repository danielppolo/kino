"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import RecurringTransactionsSection from "./(components)/recurring-transactions-section";

import PageHeader from "@/components/shared/page-header";
import RecurringTransactionForm from "@/components/shared/recurring-transaction-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { RecurringTransaction } from "@/utils/supabase/types";

export default function Page() {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleAdd = () => {
    setEditItem(null);
    setOpen(true);
  };

  const handleEdit = (t: RecurringTransaction) => {
    setEditItem(t);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditItem(null);
  };

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", value);
    router.push(`/app/settings/recurrent-transactions?${params.toString()}`);
  };

  const activeType = searchParams.get("type") || "expense";

  return (
    <>
      <Tabs onValueChange={handleTabChange} defaultValue={activeType}>
        <PageHeader>
          <div className="flex items-center gap-4">
            <TabsList>
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex gap-2">
            <TooltipButton
              size="sm"
              variant="outline"
              tooltip="Add recurring transaction"
              onClick={handleAdd}
            >
              <Plus className="size-4" />
            </TooltipButton>
          </div>
        </PageHeader>
        <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
          <TabsContent value="income">
            <RecurringTransactionsSection
              type="income"
              onEdit={handleEdit}
              isActive={activeType === "income"}
            />
          </TabsContent>

          <TabsContent value="expense">
            <RecurringTransactionsSection
              type="expense"
              onEdit={handleEdit}
              isActive={activeType === "expense"}
            />
          </TabsContent>
        </div>
      </Tabs>
      <RecurringTransactionForm
        type={(searchParams.get("type") as "income" | "expense") || "expense"}
        recurring={editItem ?? undefined}
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
      />
    </>
  );
}
