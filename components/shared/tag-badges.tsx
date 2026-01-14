import React from "react";
import { useRouter } from "next/navigation";

import { Badge } from "../ui/badge";
import Color from "./color";
import LinkTransferButton from "./link-transfer-button";

import { useLabels, useTags } from "@/contexts/settings-context";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";
import { cn } from "@/lib/utils";
import { TransactionList } from "@/utils/supabase/types";

interface TagBadgesProps {
  transaction: TransactionList;
  className?: string;
}

const TagBadges = ({ transaction, className }: TagBadgesProps) => {
  const router = useRouter();
  const [, setFilters] = useTransactionQueryState();
  const [, tagMap] = useTags();
  const [, labelMap] = useLabels();

  const handleTagClick = (tagId: string) => {
    setFilters({ tag: tagId });
  };

  const handleLabelClick = (labelId: string) => {
    setFilters({ label_id: labelId });
  };

  return (
    <div
      className={cn(
        "relative hidden flex-wrap items-center gap-1 md:flex",
        className,
      )}
    >
      {!!transaction.label_id && labelMap.get(transaction.label_id)?.color && (
        <Color
          size="sm"
          onClick={() => handleLabelClick(transaction.label_id)}
          color={labelMap.get(transaction.label_id)?.color}
          className="mx-2 size-1.5"
        />
      )}
      {transaction.tag_ids?.map((tagId: string, index) => {
        const tag = tagMap.get(tagId);
        if (!tag) return null;

        return (
          <Badge
            key={tagId}
            variant="outline"
            className="bg-background cursor-pointer text-xs"
            // style={{
            //   transform: `translateX(${-18 * index}px)`,
            // }}
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
