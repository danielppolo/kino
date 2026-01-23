"use client";

import { ArrowRightLeft } from "lucide-react";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";

const TypeFilter = () => {
  const [filters, setFilters] = useTransactionQueryState();
  const type = filters.type || undefined;

  const options: ComboboxOption[] = [
    { value: "", label: "All Types" },
    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
    { value: "transfer", label: "Transfer" },
  ];

  const handleTypeChange = (value: string) => {
    setFilters({ type: value || null });
  };

  return (
    <Combobox
      size="sm"
      icon={<ArrowRightLeft className="size-4" />}
      variant={type ? "secondary" : "ghost"}
      options={options}
      value={type || ""}
      onChange={handleTypeChange}
      placeholder="Type"
      className="w-auto"
    />
  );
};

export default TypeFilter;
