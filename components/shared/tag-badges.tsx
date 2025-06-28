import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "../ui/badge";
import LinkTransferButton from "./link-transfer-button";

import { useTags } from "@/contexts/settings-context";
import { TransactionList } from "@/utils/supabase/types";

interface TagBadgesProps {
  transaction: TransactionList;
  className?: string;
}

const TagBadges = ({ transaction, className }: TagBadgesProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tags] = useTags();

  const handleTagClick = (tagId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tag", tagId);
    router.push(`/app/transactions?${params.toString()}`);
  };

  if (!transaction.tag_ids || transaction.tag_ids.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {transaction.tag_ids.map((tagId: string) => {
        const tag = tags.find((t) => t.id === tagId);
        if (!tag) return null;

        return (
          <Badge
            key={tagId}
            variant="secondary"
            className="cursor-pointer text-xs"
            onClick={() => handleTagClick(tagId)}
          >
            {tag.title}
          </Badge>
        );
      })}
      <LinkTransferButton transaction={transaction} />
    </div>
  );
};

export default TagBadges;
