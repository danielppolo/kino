"use client";

import React from "react";
import { format } from "date-fns";
import { ReceiptText } from "lucide-react";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useWallets } from "@/contexts/settings-context";
import { Bill } from "@/utils/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { listBills } from "@/utils/supabase/queries";

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
  const [, walletMap] = useWallets();

  const { data: billsData, isLoading } = useQuery({
    queryKey: ["bills", walletId],
    queryFn: async () => {
      const supabase = createClient();
      const result = await listBills(supabase, { walletId });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });

  const bills = billsData ?? [];

  // Filter bills by wallet if provided (client-side for now, but query handles it)
  const filteredBills = bills;

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
  const options: ComboboxOption[] = [
    { value: "", label: "None", keywords: ["none", "clear"] },
    ...billOptions,
  ];

  const billMap = new Map<string, Bill>();
  filteredBills.forEach((b) => billMap.set(b.id, b));

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <Combobox
        variant={variant}
        size={size}
        icon={<ReceiptText className="size-4" />}
        options={[]}
        value=""
        onChange={onChange}
        placeholder="Loading bills..."
        className={className}
        disabled
      />
    );
  }

  return (
    <Combobox
      variant={variant}
      size={size}
      icon={<ReceiptText className="size-4" />}
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
              <ReceiptText className="text-muted-foreground size-4" />
              <span className="truncate">{bill.description}</span>
            </span>
          );
        }
        return placeholder;
      }}
      renderOption={(option) => {
        if (option.value === "") {
          return <span className="text-muted-foreground">None</span>;
        }
        const bill = billMap.get(option.value);
        if (bill) {
          const dueDate = format(new Date(bill.due_date), "MMM d");
          return (
            <span className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <ReceiptText className="text-muted-foreground size-4" />
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
