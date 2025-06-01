import React from "react";

import { Badge } from "../ui/badge";

import { Transaction } from "@/utils/supabase/types";

interface TagBadgesProps {
  transaction: Transaction;
}

const TagBadges: React.FC<TagBadgesProps> = ({ transaction }) => {
  console.log(transaction);
  return (
    <div className="flex gap-1">
      {transaction.tags?.map((tag) => (
        <Badge variant="outline" key={tag}>
          {tag}
        </Badge>
      ))}
    </div>
  );
};

export default TagBadges;
