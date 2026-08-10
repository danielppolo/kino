"use client";

import * as React from "react";
import {
  Building2,
  MapPin,
  MoreHorizontal,
  Plane,
  UserRound,
  X,
} from "lucide-react";

import { TransactionOntologyPicker } from "./transaction-ontology-editor";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type OntologyAssociationItem,
  type OntologyAssociationType,
} from "@/utils/ontology-associations";

interface TransactionOntologyMenuProps {
  workspaceId: string;
  value: OntologyAssociationItem[];
  onChange: (value: OntologyAssociationItem[]) => void;
  trigger?: React.ReactNode;
}

export function TransactionOntologyMenu({
  workspaceId,
  value,
  onChange,
  trigger,
}: TransactionOntologyMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [associationType, setAssociationType] =
    React.useState<OntologyAssociationType>();

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setAssociationType(undefined);
      }}
    >
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            aria-label="More transaction options"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={associationType ? "w-72 p-2" : "w-52 p-1"}
      >
        {associationType ? (
          <div className="space-y-2">
            {value.some((item) => item.type === associationType) ? (
              <div className="flex flex-wrap gap-1.5 border-b pb-2">
                {value
                  .filter((item) => item.type === associationType)
                  .map((item) => (
                    <Button
                      key={item.sourceObjectId}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 max-w-full gap-1 rounded-full px-2 text-xs"
                      aria-label={`Remove ${item.name}`}
                      onClick={() =>
                        onChange(
                          value.filter(
                            (current) =>
                              current.sourceObjectId !== item.sourceObjectId,
                          ),
                        )
                      }
                    >
                      <span className="truncate">{item.name}</span>
                      <X aria-hidden="true" className="size-3 shrink-0" />
                    </Button>
                  ))}
              </div>
            ) : null}
            <TransactionOntologyPicker
              key={associationType}
              embedded
              workspaceId={workspaceId}
              type={associationType}
              value={value.find((item) => item.type === associationType)}
              excludedSourceIds={
                associationType === "person"
                  ? new Set(
                      value
                        .filter((item) => item.type === "person")
                        .map((item) => item.sourceObjectId),
                    )
                  : undefined
              }
              onClose={() => {
                setOpen(false);
                setAssociationType(undefined);
              }}
              onSelect={(item) => {
                if (associationType === "person") {
                  onChange([...value, item]);
                  return;
                }
                onChange([
                  ...value.filter(
                    (association) => association.type !== associationType,
                  ),
                  item,
                ]);
              }}
            />
          </div>
        ) : (
          <div className="space-y-0.5">
            {(
              [
                ["person", "People", UserRound],
                ["place", "Places", MapPin],
                ["organization", "Organizations", Building2],
                ["trip", "Trips", Plane],
              ] as const
            ).map(([itemType, label, Icon]) => {
              const count = value.filter(
                (item) => item.type === itemType,
              ).length;
              return (
                <button
                  key={itemType}
                  type="button"
                  className="hover:bg-accent focus-visible:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none"
                  onClick={() => setAssociationType(itemType)}
                >
                  <Icon className="size-4" />
                  {label}
                  {count ? (
                    <span className="text-muted-foreground ml-auto text-xs">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
