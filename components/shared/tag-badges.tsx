import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "../ui/badge";

import { Transaction } from "@/utils/supabase/types";

interface TagBadgesProps {
  transaction: Transaction;
}

const TagBadges: React.FC<TagBadgesProps> = ({ transaction }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setTag = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tag", value);
    router.push(`/app/transactions?${params.toString()}`);
  };

  const handleTagChange = (value: string) => {
    setTag(value);
  };

  return (
    <div className="flex gap-1">
      {transaction.tags?.map((tag) => (
        <Badge
          variant="outline"
          key={tag}
          onClick={(event) => {
            event.stopPropagation();
            handleTagChange(tag);
          }}
        >
          {tag}
        </Badge>
      ))}
      {transaction.transfer_id && (
        <Badge
          variant="secondary"
          className="font-mono font-light"
          onClick={(event) => {
            event.stopPropagation();
            router.push(
              `/app/transactions/${transaction.transfer_wallet_id}?transfer_id=${transaction.transfer_id}`,
            );
          }}
        >
          {transaction.transfer_id.slice(-4).toUpperCase()}
        </Badge>
      )}
    </div>
  );
};

export default TagBadges;
