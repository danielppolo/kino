"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";

import BillForm from "./bill-form";
import BillsList from "./bills-list";

import BillsBalanceBadge from "@/app/app/(transactions)/(components)/bills-balance-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useQueryClient } from "@tanstack/react-query";

interface BillsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillsSheet({ open, onOpenChange }: BillsSheetProps) {
  const params = useParams();
  const walletId = params.walletId as string | undefined;
  const [billFormOpen, setBillFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleBillFormSuccess = () => {
    setBillFormOpen(false);
    queryClient.invalidateQueries({ queryKey: ["bills-with-payments"] });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col sm:max-w-2xl"
        >
          <SheetHeader>
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="flex items-center gap-2">
                Bills
                <BillsBalanceBadge alwaysShow />
              </SheetTitle>
              <TooltipButton
                size="sm"
                variant="outline"
                tooltip="Add new bill"
                onClick={() => setBillFormOpen(true)}
              >
                <Plus className="size-4" />
              </TooltipButton>
            </div>
            <SheetDescription>
              View and track your bills and payment schedules.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            <BillsList walletId={walletId} />
          </div>
        </SheetContent>
      </Sheet>

      <BillForm
        open={billFormOpen}
        onOpenChange={setBillFormOpen}
        defaultWalletId={walletId}
        onSuccess={handleBillFormSuccess}
      />
    </>
  );
}
