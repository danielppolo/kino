"use client";

import React, { memo } from "react";
import { format } from "date-fns";
import { Receipt, RefreshCcw } from "lucide-react";

import SelectableRow from "./selectable-row";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { Text } from "@/components/ui/typography";
import { Bill } from "@/utils/supabase/types";

interface BillRowProps {
  bill: Bill;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (event: React.MouseEvent<HTMLDivElement>) => void;
  active?: boolean;
}

export function BillRow({
  bill,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  active = false,
}: BillRowProps) {
  const dueDate = new Date(bill.due_date);
  const isOverdue = dueDate < new Date();

  return (
    <SelectableRow
      id={bill.id}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      active={active}
    >
      <div className="shrink-0">
        <Receipt className="text-muted-foreground size-4" />
      </div>
      <Text className="shrink grow truncate">{bill.description}</Text>
      {bill.is_recurring && bill.interval_type && (
        <Badge
          variant="outline"
          className="bg-background hidden gap-1 text-xs md:flex"
        >
          <RefreshCcw className="size-3" />
          {bill.interval_type}
        </Badge>
      )}
      <Text
        muted
        small
        className={isOverdue ? "text-destructive" : undefined}
      >
        {format(dueDate, "MMM d, yyyy")}
      </Text>
      <Money
        cents={bill.amount_cents}
        currency={bill.currency}
        className="text-muted-foreground text-sm"
      />
    </SelectableRow>
  );
}

export function BillRowLoading() {
  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <div className="bg-muted h-4 w-4 animate-pulse rounded" />
      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
      <div className="bg-muted h-4 w-20 animate-pulse rounded" />
      <div className="bg-muted h-4 w-16 animate-pulse rounded" />
    </div>
  );
}

export default memo(
  BillRow,
  (prevProps, nextProps) =>
    prevProps.bill.id === nextProps.bill.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.active === nextProps.active,
);

