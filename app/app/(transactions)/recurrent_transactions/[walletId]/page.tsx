"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";

import RecurringTransactionsSection from "../(components)/recurring-transactions-section";
import RecurringTransactionForm from "@/components/shared/recurring-transaction-form";
import { Button } from "@/components/ui/button";
import { Title } from "@/components/ui/typography";
import { RecurringTransaction } from "@/utils/supabase/types";

export default function Page() {
  const { walletId } = useParams<{ walletId: string }>();
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
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="size-4" />
        </Button>
      </div>
      <RecurringTransactionsSection walletId={walletId} onEdit={handleEdit} />
      <RecurringTransactionForm
        walletId={walletId}
        recurring={editItem || undefined}
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
      />
    </div>
  );
}
