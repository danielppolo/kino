"use client";

import React, { memo } from "react";
import { format } from "date-fns";
import { Receipt, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { Text } from "../ui/typography";

import { DAY_HEADER_HEIGHT } from "@/utils/constants";
import { BillWithPayments } from "@/utils/supabase/types";

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
      <Receipt className="text-muted-foreground size-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Text className="truncate font-medium">{bill.description}</Text>
            {bill.is_recurring && bill.interval_type && (
              <Badge
                variant="outline"
                className="bg-background hidden gap-1 text-xs md:flex"
              >
                <RefreshCcw className="size-3" />
                {bill.interval_type}
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Text
              small
              muted
              className={isOverdue ? "text-destructive" : undefined}
            >
              Due {format(dueDate, "MMM d, yyyy")}
            </Text>
            <Money
              cents={bill.amount_cents}
              currency={bill.currency}
              className="text-muted-foreground text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Progress
            value={bill.payment_percentage}
            className="h-1.5 flex-1"
          />
          <Text
            small
            className={
              isPaid
                ? "text-green-600 dark:text-green-400"
                : isOverdue
                  ? "text-destructive"
                  : "text-muted-foreground"
            }
          >
            {bill.payment_percentage}%
          </Text>
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

