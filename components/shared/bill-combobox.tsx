"use client";

import React, { useMemo } from "react";
import { format } from "date-fns";
import { Receipt } from "lucide-react";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useBills, useWallets } from "@/contexts/settings-context";
import { Bill } from "@/utils/supabase/types";

interface BillComboboxProps {
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  walletId?: string;
}

const BillCombobox = ({
  size = "default",
  variant = "outline",
  value,
  onChange,
  placeholder = "Link to bill (optional)",
  className,
  walletId,
}: BillComboboxProps) => {
  const [bills] = useBills();
  const [, walletMap] = useWallets();

  // Filter bills by wallet if provided
  const filteredBills = useMemo(() => {
    if (!walletId) return bills;
    return bills.filter((bill) => bill.wallet_id === walletId);
  }, [bills, walletId]);

  const options: ComboboxOption[] = useMemo(() => {
    const billOptions = filteredBills
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .map((bill) => {
        const wallet = walletMap.get(bill.wallet_id);
        const dueDate = format(new Date(bill.due_date), "MMM d");
        return {
          value: bill.id,
          label: bill.description,
          keywords: [
            bill.description.toLowerCase(),
            dueDate.toLowerCase(),
            wallet?.name.toLowerCase() ?? "",
          ],
        };
      });

    // Add "None" option at the beginning
    return [{ value: "", label: "None", keywords: ["none", "clear"] }, ...billOptions];
  }, [filteredBills, walletMap]);

  const billMap = useMemo(() => {
    const map = new Map<string, Bill>();
    filteredBills.forEach((b) => map.set(b.id, b));
    return map;
  }, [filteredBills]);

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(cents / 100);
  };

  return (
    <Combobox
      variant={variant}
      size={size}
      icon={<Receipt className="size-4" />}
      options={options}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      renderValue={(option) => {
        if (!option || option.value === "") {
          return placeholder;
        }
        const bill = billMap.get(option.value);
        if (bill) {
          return (
            <span className="flex items-center gap-2">
              <Receipt className="text-muted-foreground size-4" />
              <span className="truncate">{bill.description}</span>
            </span>
          );
        }
        return placeholder;
      }}
      renderOption={(option) => {
        if (option.value === "") {
          return (
            <span className="text-muted-foreground">None</span>
          );
        }
        const bill = billMap.get(option.value);
        if (bill) {
          const dueDate = format(new Date(bill.due_date), "MMM d");
          return (
            <span className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Receipt className="text-muted-foreground size-4" />
                <span>{bill.description}</span>
              </span>
              <span className="text-muted-foreground text-xs">
                {dueDate} · {formatAmount(bill.amount_cents, bill.currency)}
              </span>
            </span>
          );
        }
        return option.label;
      }}
    />
  );
};

export default BillCombobox;

