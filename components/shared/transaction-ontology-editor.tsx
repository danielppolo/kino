"use client";

import * as React from "react";
import {
  Building2,
  Check,
  ChevronsUpDown,
  MapPin,
  Plane,
  UserRound,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  type OntologyAssociationItem,
  type OntologyAssociationType,
} from "@/utils/ontology-associations";

const TYPE_META = {
  person: { label: "Person", Icon: UserRound },
  place: { label: "Place", Icon: MapPin },
  organization: { label: "Organization", Icon: Building2 },
  trip: { label: "Trip", Icon: Plane },
} satisfies Record<
  OntologyAssociationType,
  { label: string; Icon: typeof UserRound }
>;

interface OntologyPickerProps {
  workspaceId: string;
  type: OntologyAssociationType;
  value?: OntologyAssociationItem;
  excludedSourceIds?: Set<string>;
  onSelect: (item: OntologyAssociationItem) => void;
}

function OntologyPicker({
  workspaceId,
  type,
  value,
  excludedSourceIds,
  onSelect,
}: OntologyPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<OntologyAssociationItem[]>([]);
  const [status, setStatus] = React.useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const { label, Icon } = TYPE_META[type];

  React.useEffect(() => {
    const trimmedQuery = query.trim();
    if (!open || trimmedQuery.length < 2) {
      setItems([]);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setStatus("loading");
      const params = new URLSearchParams({
        workspaceId,
        q: trimmedQuery,
        types: type,
        limit: "8",
      });

      fetch(`/api/ontology-associations/search?${params}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Search failed");
          return response.json() as Promise<{
            items?: OntologyAssociationItem[];
          }>;
        })
        .then((data) => {
          setItems(data.items ?? []);
          setStatus("ready");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          setItems([]);
          setStatus("error");
        });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [open, query, type, workspaceId]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          className="w-full justify-between font-normal"
          type="button"
          variant="outline"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon className="text-muted-foreground size-4 shrink-0" />
            <span className="truncate">
              {value?.name ?? `Select ${label.toLowerCase()}`}
            </span>
          </span>
          <ChevronsUpDown className="text-muted-foreground size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2" align="start">
        <Input
          autoFocus
          aria-label={`Search ${label.toLowerCase()}s`}
          placeholder={`Search ${label.toLowerCase()}s…`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="max-h-56 overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="text-muted-foreground px-2 py-3 text-sm">
              Type at least 2 characters.
            </p>
          ) : null}
          {status === "loading" ? (
            <p className="text-muted-foreground px-2 py-3 text-sm">
              Searching…
            </p>
          ) : null}
          {status === "error" ? (
            <p className="text-destructive px-2 py-3 text-sm">
              Search is temporarily unavailable.
            </p>
          ) : null}
          {status === "ready" && items.length === 0 ? (
            <p className="text-muted-foreground px-2 py-3 text-sm">
              No {label.toLowerCase()}s found.
            </p>
          ) : null}
          {items.map((item) => {
            const excluded = excludedSourceIds?.has(item.sourceObjectId);
            return (
              <button
                className={cn(
                  "hover:bg-accent flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm",
                  excluded && "pointer-events-none opacity-50",
                )}
                disabled={excluded}
                key={item.sourceObjectId}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    value?.sourceObjectId === item.sourceObjectId
                      ? "opacity-100"
                      : "opacity-0",
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate">{item.name}</span>
                  {item.subtitle ? (
                    <span className="text-muted-foreground block truncate text-xs">
                      {item.subtitle}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TransactionOntologyEditorProps {
  workspaceId: string;
  value: OntologyAssociationItem[];
  onChange: (value: OntologyAssociationItem[]) => void;
  type?: OntologyAssociationType;
}

export function TransactionOntologyEditor({
  workspaceId,
  value,
  onChange,
  type,
}: TransactionOntologyEditorProps) {
  const people = value.filter((item) => item.type === "person");
  const peopleIds = new Set(people.map((item) => item.sourceObjectId));

  function replaceSingleton(
    type: Exclude<OntologyAssociationType, "person">,
    item?: OntologyAssociationItem,
  ) {
    onChange([
      ...value.filter((association) => association.type !== type),
      ...(item ? [item] : []),
    ]);
  }

  return (
    <section className="space-y-3">
      {!type || type === "person" ? (
        <div className="space-y-2">
          <span className="text-sm">People</span>
          {people.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {people.map((person) => (
                <Badge
                  className="gap-1 pr-1"
                  key={person.sourceObjectId}
                  variant="secondary"
                >
                  <UserRound className="size-3" />
                  {person.name}
                  <button
                    aria-label={`Remove ${person.name}`}
                    className="rounded-full p-0.5 hover:bg-black/10"
                    type="button"
                    onClick={() =>
                      onChange(
                        value.filter(
                          (item) =>
                            item.sourceObjectId !== person.sourceObjectId,
                        ),
                      )
                    }
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
          <OntologyPicker
            excludedSourceIds={peopleIds}
            type="person"
            workspaceId={workspaceId}
            onSelect={(item) => onChange([...value, item])}
          />
        </div>
      ) : null}

      <div className={cn("grid gap-3", !type && "sm:grid-cols-3")}>
        {(["trip", "place", "organization"] as const)
          .filter((associationType) => !type || associationType === type)
          .map((associationType) => {
            const selected = value.find(
              (item) => item.type === associationType,
            );
            return (
              <div className="space-y-1.5" key={associationType}>
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {TYPE_META[associationType].label}
                  </span>
                  {selected ? (
                    <button
                      className="text-muted-foreground hover:text-foreground text-xs"
                      type="button"
                      onClick={() => replaceSingleton(associationType)}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <OntologyPicker
                  type={associationType}
                  value={selected}
                  workspaceId={workspaceId}
                  onSelect={(item) => replaceSingleton(associationType, item)}
                />
              </div>
            );
          })}
      </div>
    </section>
  );
}
