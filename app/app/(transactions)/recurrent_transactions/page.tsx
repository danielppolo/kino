"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import RecurringTransactionsSection from "./(components)/recurring-transactions-section";
import RecurringTransactionForm from "@/components/shared/recurring-transaction-form";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { Title } from "@/components/ui/typography";
import { RecurringTransaction } from "@/utils/supabase/types";

export default function Page() {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null);

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

  return (
    <div>
      <div className="bg-background sticky top-0 z-10 flex items-center justify-between py-6">
        <Title>Recurring Transactions</Title>
        <TooltipButton
          size="sm"
          variant="outline"
          tooltip="Add recurring transaction"
          onClick={handleAdd}
        >
          <Plus className="size-4" />
        </TooltipButton>
      </div>
      <RecurringTransactionsSection onEdit={handleEdit} />
      <RecurringTransactionForm
        walletId=""
        recurring={editItem || undefined}
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
      />
    </div>
  );
}
