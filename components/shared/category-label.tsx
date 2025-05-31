import React from "react";
import { ArrowRightLeft } from "lucide-react";

import { Badge } from "../ui/badge";
import { Icon } from "../ui/icon";

import { useCategories, useLabels } from "@/contexts/settings-context";
import { cn } from "@/lib/utils";
import { Transaction } from "@/utils/supabase/types";

interface CategoryLabelProps {
  transaction: Transaction;
}

function Circle({
  color,
  children,
  className,
}: {
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-xl",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {children}
    </div>
  );
}

const CategoryLabel: React.FC<CategoryLabelProps> = ({ transaction }) => {
  const [, categoriesMap] = useCategories();
  const category =
    !!transaction.category_id && categoriesMap.get(transaction.category_id);
  const [, labelsMap] = useLabels();
  const label = !!transaction.label_id && labelsMap.get(transaction.label_id);

  return (
    <Badge variant="outline">
      <span className="text-xs">{category?.name}</span>
    </Badge>
  );

  if (transaction.type === "transfer") {
    return (
      <Circle color="gray">
        <ArrowRightLeft className="size-4" />
      </Circle>
    );
  }

  return (
    <Circle color={label?.color ?? "gray"} className="text-xl">
      <Icon name={category?.icon} />
    </Circle>
  );
};

export default CategoryLabel;
