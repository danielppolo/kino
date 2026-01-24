"use client";

import React, { memo } from "react";

import { Text } from "../ui/typography";

import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { DAY_HEADER_HEIGHT } from "@/utils/constants";
import { BillWithPayments } from "@/utils/supabase/types";
import { Badge } from "../ui/badge";
import { format } from "date-fns";

interface BillGroupHeaderProps {
  bill: BillWithPayments;
}

const BillGroupHeader: React.FC<BillGroupHeaderProps> = ({ bill }) => {
  const dueDate = new Date(bill.due_date);
  const isOverdue = dueDate < new Date() && bill.payment_percentage < 100;
  const isPaid = bill.payment_percentage >= 100;

  return (
    <div
      className="bg-muted/40 border-muted flex items-center gap-3 border-t px-4"
      style={{
        minHeight: DAY_HEADER_HEIGHT + 8,
      }}
    >
      <div className="flex min-w-0 flex-1 justify-between gap-1 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Text className="truncate font-medium">{bill.description}</Text>
            <Text muted>{format(dueDate, "MMM yyyy")}</Text>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Progress
            value={bill.payment_percentage}
            className="h-1.5 w-24 flex-1"
          />
          <Money
            cents={bill.amount_cents}
            currency={bill.currency}
            className="text-muted-foreground text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export const BillGroupHeaderLoading: React.FC = () => {
  return (
    <div className="bg-muted/40 flex h-14 items-center gap-3 px-4">
      <div className="bg-muted h-4 w-4 animate-pulse rounded" />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="bg-muted h-4 w-32 animate-pulse rounded-md" />
          <div className="bg-muted h-4 w-24 animate-pulse rounded-md" />
        </div>
        <div className="bg-muted h-1.5 w-full animate-pulse rounded-full" />
      </div>
    </div>
  );
};

export default memo(BillGroupHeader);
