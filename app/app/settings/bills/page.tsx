"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Repeat } from "lucide-react";
import { useSearchParams } from "next/navigation";

import BillsSection from "./(components)/bills-section";

import BillForm from "@/components/shared/bill-form";
import RecurrentBillForm from "@/components/shared/recurrent-bill-form";
import PageHeader from "@/components/shared/page-header";
import { TooltipButton } from "@/components/ui/tooltip-button";
import type { Database } from "@/utils/supabase/database.types";

type RecurrentBill = Database["public"]["Tables"]["recurrent_bills"]["Row"];

export default function Page() {
  const [billFormOpen, setBillFormOpen] = useState(false);
  const [recurrentFormOpen, setRecurrentFormOpen] = useState(false);
  const [editBill, setEditBill] = useState<RecurrentBill | undefined>(
    undefined,
  );
  const searchParams = useSearchParams();

  useEffect(() => {
    const action = searchParams.get("new");

    if (action === "bill") {
      setBillFormOpen(true);
      return;
    }

    if (action === "recurrent") {
      setEditBill(undefined);
      setRecurrentFormOpen(true);
    }
  }, [searchParams]);

  const handleAddBill = () => {
    setBillFormOpen(true);
  };

  const handleAddRecurrent = () => {
    setEditBill(undefined);
    setRecurrentFormOpen(true);
  };

  const handleEditRecurrent = (bill: RecurrentBill) => {
    setEditBill(bill);
    setRecurrentFormOpen(true);
  };

  const handleRecurrentFormClose = () => {
    setRecurrentFormOpen(false);
    setEditBill(undefined);
  };

  const handleBillFormSuccess = () => {
    setBillFormOpen(false);
  };

  const handleRecurrentFormSuccess = () => {
    handleRecurrentFormClose();
  };

  return (
    <>
      <PageHeader>
        <div className="flex gap-2">
          <TooltipButton
            size="sm"
            variant="outline"
            tooltip="Add one-off bill"
            onClick={handleAddBill}
          >
            <CalendarPlus className="size-4" />
          </TooltipButton>
          <TooltipButton
            size="sm"
            variant="outline"
            tooltip="Add recurrent bill"
            onClick={handleAddRecurrent}
          >
            <Repeat className="size-4" />
          </TooltipButton>
        </div>
      </PageHeader>
      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        <BillsSection onEdit={handleEditRecurrent} />
      </div>

      <BillForm
        open={billFormOpen}
        onOpenChange={setBillFormOpen}
        onSuccess={handleBillFormSuccess}
      />

      <RecurrentBillForm
        open={recurrentFormOpen}
        onOpenChange={setRecurrentFormOpen}
        onSuccess={handleRecurrentFormSuccess}
        recurrentBill={editBill}
      />
    </>
  );
}
