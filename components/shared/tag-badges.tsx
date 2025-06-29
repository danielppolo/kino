import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "../ui/badge";
import LinkTransferButton from "./link-transfer-button";

import { useTags } from "@/contexts/settings-context";
import { cn } from "@/lib/utils";
import { TransactionList } from "@/utils/supabase/types";

interface TagBadgesProps {
  transaction: TransactionList;
  className?: string;
}

const TagBadges = ({ transaction, className }: TagBadgesProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, tagMap] = useTags();

  const handleTagClick = (tagId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tag", tagId);
    router.push(`/app/transactions?${params.toString()}`);
  };

  return (
    <div className={cn("hidden flex-wrap gap-1 md:flex", className)}>
      {transaction.tag_ids?.map((tagId: string) => {
        const tag = tagMap.get(tagId);
        if (!tag) return null;

        return (
          <Badge
            key={tagId}
            variant="secondary"
            className="cursor-pointer text-xs"
            onClick={(event) => {
              event.stopPropagation();
              handleTagClick(tagId);
            }}
          >
            {tag.title}
          </Badge>
        );
      })}
      {transaction.type === "transfer" && !transaction.transfer_id && (
        <LinkTransferButton transaction={transaction} />
      )}
      {transaction.type === "transfer" && transaction.transfer_id && (
        <Badge
          variant="secondary"
          className="cursor-pointer text-xs uppercase"
          onClick={(event) => {
            event.stopPropagation();
            router.push(
              `/app/transactions/${transaction.wallet_id}?transfer_id=${transaction.transfer_id}`,
            );
          }}
        >
          {transaction.transfer_id.slice(-4)}
        </Badge>
      )}
    </div>
  );
};

export default TagBadges;
