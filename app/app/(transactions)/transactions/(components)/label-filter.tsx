"use client";

import { Sparkle } from "lucide-react";

import LabelCombobox from "@/components/shared/label-combobox";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";

const LabelFilter = () => {
  const [filters, setFilters] = useTransactionQueryState();
  const labelId = filters.label_id || undefined;

  const setLabelId = (id: string | undefined) => {
    setFilters({ label_id: id ?? null });
  };

  const handleLabelChange = (id: string) => {
    setLabelId(id);
  };

  return (
    <LabelCombobox
      icon={<Sparkle className="size-4" />}
      size="sm"
      variant={labelId ? "secondary" : "ghost"}
      value={labelId ?? null}
      onChange={handleLabelChange}
      placeholder="Label"
      className="w-auto"
    />
  );
};

export default LabelFilter;
