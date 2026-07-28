import React from "react";
import { useRouter } from "next/navigation";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import Color from "./color";
import LabelCombobox from "./label-combobox";
import LinkTransferButton from "./link-transfer-button";

import {
  useFeatureFlags,
  useLabels,
  useTags,
} from "@/contexts/settings-context";
import { useTransactionQueryState } from "@/hooks/use-transaction-query";
import { cn } from "@/lib/utils";
import { parseStoredOntologyAssociations } from "@/utils/ontology-associations";
import { TransactionList } from "@/utils/supabase/types";

interface TagBadgesProps {
  transaction: TransactionList;
  className?: string;
  onAssignLabel?: (labelId: string) => void;
  showLabelCombobox?: boolean;
}

const TagBadges = ({
  transaction,
  className,
  onAssignLabel,
  showLabelCombobox = true,
}: TagBadgesProps) => {
  const router = useRouter();
  const [, setFilters] = useTransactionQueryState();
  const [, tagMap] = useTags();
  const [, labelMap] = useLabels();
  const { ontology_associations_enabled } = useFeatureFlags();

  const handleTagClick = (tagId: string) => {
    setFilters({ tag: tagId });
  };

  const handleLabelClick = (labelId: string) => {
    setFilters({ label_id: labelId });
  };

  const handleNeedsReviewClick = () => {
    setFilters({ review_status: "needs_review" });
  };
  const ontologyAssociations = ontology_associations_enabled
    ? parseStoredOntologyAssociations(transaction.ontology_associations)
    : [];
  const labelColor = transaction.label_id
    ? labelMap.get(transaction.label_id)?.color
    : undefined;

  return (
    <div
      className={cn(
        "relative hidden flex-wrap items-center gap-1 md:flex",
        className,
      )}
    >
      {transaction.tag_ids?.map((tagId: string) => {
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
      {ontologyAssociations.slice(0, 3).map((association) => (
        <Badge
          className="bg-background cursor-pointer text-xs"
          key={`${association.type}:${association.ontologyId}`}
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            if (association.entityId) {
              setFilters({ ontology_entity_id: association.entityId });
            }
          }}
        >
          {association.name}
        </Badge>
      ))}
      {ontologyAssociations.length > 3 ? (
        <Badge variant="secondary">+{ontologyAssociations.length - 3}</Badge>
      ) : null}
      {transaction.needs_review && (
        <Badge
          variant="secondary"
          className="cursor-pointer text-xs"
          onClick={(event) => {
            event.stopPropagation();
            handleNeedsReviewClick();
          }}
        >
          Review
        </Badge>
      )}
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
      {labelColor ||
      (showLabelCombobox && onAssignLabel && !transaction.label_id) ? (
        <div
          className="flex size-10 shrink-0 items-center justify-center"
          onClick={(event) => event.stopPropagation()}
        >
          {labelColor ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleLabelClick(transaction.label_id!)}
              aria-label="Filter by label"
            >
              <Color
                size="sm"
                color={labelColor}
                className="size-1.5 rounded-full"
              />
            </Button>
          ) : (
            <LabelCombobox
              aria-label="Add label"
              comboboxVariant="icon"
              size="icon"
              variant="ghost"
              value={null}
              onChange={(labelId) => {
                if (labelId) {
                  onAssignLabel?.(labelId);
                }
              }}
              icon={<Color size="sm" className="size-1.5 rounded-full" />}
              className="size-10 p-0"
            />
          )}
        </div>
      ) : null}
    </div>
  );
};

export default TagBadges;
