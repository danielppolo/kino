"use client";

import { Receipt } from "lucide-react";
import { useParams } from "next/navigation";

import BillsList from "./bills-list";

import BillsBalanceBadge from "@/app/app/(transactions)/(components)/bills-balance-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface BillsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillsSheet({ open, onOpenChange }: BillsSheetProps) {
  const params = useParams();
  const walletId = params.walletId as string | undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="size-5" />
            Bills
            <BillsBalanceBadge alwaysShow />
          </SheetTitle>
          <SheetDescription>
            View and track your bills and payment schedules.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          <BillsList walletId={walletId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
