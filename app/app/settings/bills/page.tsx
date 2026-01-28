"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import BillsSection from "./(components)/bills-section";

import BillForm from "@/components/shared/bill-form";
import PageHeader from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { Bill } from "@/utils/supabase/types";

export default function Page() {
  const [open, setOpen] = useState(false);
  const [editBill, setEditBill] = useState<Bill | undefined>(undefined);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeType = searchParams.get("type") || "future";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", value);
    router.push(`/app/settings/bills?${params.toString()}`);
  };

  const handleAdd = () => {
    setEditBill(undefined);
    setOpen(true);
  };

  const handleEdit = (bill: Bill) => {
    setEditBill(bill);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditBill(undefined);
  };

  return (
    <>
      <Tabs onValueChange={handleTabChange} defaultValue={activeType}>
        <PageHeader>
          <div className="flex items-center gap-4">
            <TabsList>
              <TabsTrigger value="future">Future</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex gap-2">
            <TooltipButton
              size="sm"
              variant="outline"
              tooltip="Add bill"
              onClick={handleAdd}
            >
              <Plus className="size-4" />
            </TooltipButton>
          </div>
        </PageHeader>
        <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
          <TabsContent value="future">
            <BillsSection
              type="future"
              isActive={activeType === "future"}
              onEdit={handleEdit}
            />
          </TabsContent>

          <TabsContent value="past">
            <BillsSection
              type="past"
              isActive={activeType === "past"}
              onEdit={handleEdit}
            />
          </TabsContent>
        </div>
      </Tabs>

      <BillForm
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleClose}
        bill={editBill}
      />
    </>
  );
}

