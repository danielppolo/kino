"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import BillsSection from "./(components)/bills-section";

import BillForm from "@/components/shared/bill-form";
import PageHeader from "@/components/shared/page-header";
import { TooltipButton } from "@/components/ui/tooltip-button";
import type { Database } from "@/utils/supabase/database.types";

type RecurrentBill = Database["public"]["Tables"]["recurrent_bills"]["Row"];

export default function Page() {
  const [open, setOpen] = useState(false);
  const [editBill, setEditBill] = useState<RecurrentBill | undefined>(undefined);

  const handleAdd = () => {
    setEditBill(undefined);
    setOpen(true);
  };

  const handleEdit = (bill: RecurrentBill) => {
    setEditBill(bill);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditBill(undefined);
  };

  return (
    <>
      <PageHeader>
        <div className="flex gap-2">
          <TooltipButton
            size="sm"
            variant="outline"
            tooltip="Add recurrent bill"
            onClick={handleAdd}
          >
            <Plus className="size-4" />
          </TooltipButton>
        </div>
      </PageHeader>
      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        <BillsSection onEdit={handleEdit} />
      </div>

      <BillForm
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
        recurrentBill={editBill}
      />
    </>
  );
}

