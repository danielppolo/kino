"use client";

import { useRouter, useSearchParams } from "next/navigation";

import TagCombobox from "@/components/shared/tag-combobox";
import { Tag } from "lucide-react";

const TagFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag") ?? undefined;

  const setTag = (value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("tag", value);
    } else {
      params.delete("tag");
    }
    router.push(`/app/transactions?${params.toString()}`);
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
