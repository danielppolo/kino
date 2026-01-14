"use client";

import { Tag } from "lucide-react";

import TagCombobox from "@/components/shared/tag-combobox";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";

const TagFilter = () => {
  const [filters, setFilters] = useTransactionQueryState();
  const tag = filters.tag || undefined;

  const setTag = (value: string | undefined) => {
    setFilters({ tag: value ?? null });
  };

  const handleTagChange = (value: string) => {
    setTag(value);
  };

  return (
    <TagCombobox
      size="sm"
      icon={<Tag className="h-4 w-4" />}
      variant={tag ? "secondary" : "ghost"}
      value={tag ?? null}
      onChange={handleTagChange}
      placeholder="Tag"
      className="w-auto"
    />
  );
};

export default TagFilter;
