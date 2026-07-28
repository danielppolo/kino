"use client";

import * as React from "react";
import { addDays, format, nextDay, startOfDay } from "date-fns";
import { AtSign, CalendarDays, Folder, Hash, Search, Tags } from "lucide-react";

import { useCategories, useLabels } from "@/contexts/settings-context";
import { cn } from "@/lib/utils";
import {
  type OntologyAssociationItem,
  type OntologyAssociationType,
} from "@/utils/ontology-associations";

type Trigger = "@" | "#" | "$" | "!";

type ActiveToken = {
  trigger: Trigger;
  query: string;
  start: number;
  end: number;
};

type ComposerOption = {
  id: string;
  label: string;
  subtitle?: string;
  association?: OntologyAssociationItem;
};

interface TransactionDescriptionComposerProps {
  value: string;
  onChange: (value: string) => void;
  workspaceId?: string;
  type: "income" | "expense";
  onCategoryChange: (id: string) => void;
  onLabelChange: (id: string) => void;
  onDateChange: (date: string) => void;
  onOntologyAssociationChange: (value: OntologyAssociationItem[]) => void;
  ontologyAssociations: OntologyAssociationItem[];
}

const TRIGGER_LABELS: Record<Trigger, string> = {
  "@": "Search people, places, organizations, or trips",
  "#": "Select a label",
  $: "Select a category",
  "!": "Set a date in natural language",
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function getActiveToken(value: string, cursor: number): ActiveToken | null {
  const beforeCursor = value.slice(0, cursor);
  const match = /(^|\s)([@#$!])([^\s@#$!]*)$/.exec(beforeCursor);
  if (!match) return null;

  const trigger = match[2] as Trigger;
  return {
    trigger,
    query: match[3],
    start: cursor - match[0].length + match[1].length,
    end: cursor,
  };
}

function parseNaturalDate(input: string, referenceDate = new Date()) {
  const query = input.trim().toLowerCase();
  const today = startOfDay(referenceDate);
  if (!query) return null;
  if (query === "today") return today;
  if (query === "tomorrow" || query === "tmr") return addDays(today, 1);
  if (query === "yesterday") return addDays(today, -1);

  const relative = /^(?:in )?(\d+)\s*(day|days|week|weeks)$/.exec(query);
  if (relative) {
    const amount = Number(relative[1]);
    return addDays(today, amount * (relative[2].startsWith("week") ? 7 : 1));
  }

  const weekday =
    /^(next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/.exec(
      query,
    );
  if (weekday) {
    return nextDay(
      today,
      WEEKDAYS[weekday[2]] as Parameters<typeof nextDay>[1],
    );
  }

  const absolute = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(query);
  if (absolute) {
    const candidate = new Date(
      Number(absolute[1]),
      Number(absolute[2]) - 1,
      Number(absolute[3]),
    );
    return Number.isNaN(candidate.getTime()) ||
      candidate.getFullYear() !== Number(absolute[1]) ||
      candidate.getMonth() !== Number(absolute[2]) - 1 ||
      candidate.getDate() !== Number(absolute[3])
      ? null
      : candidate;
  }

  return null;
}

function replaceToken(value: string, token: ActiveToken, replacement = "") {
  return `${value.slice(0, token.start)}${replacement}${value.slice(token.end)}`;
}

export function TransactionDescriptionComposer({
  value,
  onChange,
  workspaceId,
  type,
  onCategoryChange,
  onLabelChange,
  onDateChange,
  onOntologyAssociationChange,
  ontologyAssociations,
}: TransactionDescriptionComposerProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = React.useState(value.length);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [ontologyItems, setOntologyItems] = React.useState<
    OntologyAssociationItem[]
  >([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchFailed, setSearchFailed] = React.useState(false);
  const [categories] = useCategories();
  const [labels] = useLabels();
  const activeToken = getActiveToken(value, cursor);

  React.useEffect(() => {
    if (
      activeToken?.trigger !== "@" ||
      !workspaceId ||
      activeToken.query.trim().length < 2
    ) {
      setOntologyItems([]);
      setIsSearching(false);
      setSearchFailed(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true);
      setSearchFailed(false);
      const params = new URLSearchParams({
        workspaceId,
        q: activeToken.query.trim(),
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
        .then((data) => setOntologyItems(data.items ?? []))
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            setSearchFailed(true);
            setOntologyItems([]);
          }
        })
        .finally(() => setIsSearching(false));
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeToken?.query, activeToken?.trigger, workspaceId]);

  const options = React.useMemo<ComposerOption[]>(() => {
    if (!activeToken) return [];
    const query = activeToken.query.trim().toLowerCase();
    if (activeToken.trigger === "@") {
      return ontologyItems.map((association) => ({
        id: association.sourceObjectId,
        label: association.name,
        subtitle: association.subtitle ?? association.type,
        association,
      }));
    }
    if (activeToken.trigger === "#") {
      return labels
        .filter((label) => label.name.toLowerCase().includes(query))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8)
        .map((label) => ({ id: label.id, label: label.name }));
    }
    if (activeToken.trigger === "$") {
      return categories
        .filter(
          (category) =>
            category.type === type &&
            category.name.toLowerCase().includes(query),
        )
        .slice(0, 8)
        .map((category) => ({ id: category.id, label: category.name }));
    }

    const parsedDate = parseNaturalDate(activeToken.query);
    return parsedDate
      ? [
          {
            id: format(parsedDate, "yyyy-MM-dd"),
            label: format(parsedDate, "EEEE, MMMM d"),
          },
        ]
      : [];
  }, [activeToken, categories, labels, ontologyItems, type]);

  React.useEffect(
    () => setActiveIndex(0),
    [activeToken?.query, activeToken?.trigger],
  );

  const selectOption = React.useCallback(
    (option: ComposerOption) => {
      if (!activeToken) return;
      if (activeToken.trigger === "@" && option.association) {
        const association = option.association;
        const isDuplicate = ontologyAssociations.some(
          (item) =>
            item.type === association.type &&
            item.ontologyId === association.ontologyId,
        );
        const nextAssociations = isDuplicate
          ? ontologyAssociations
          : association.type === "person"
            ? [...ontologyAssociations, association]
            : [
                ...ontologyAssociations.filter(
                  (item) => item.type !== association.type,
                ),
                association,
              ];
        onOntologyAssociationChange(nextAssociations);
      }
      if (activeToken.trigger === "#") onLabelChange(option.id);
      if (activeToken.trigger === "$") onCategoryChange(option.id);
      if (activeToken.trigger === "!") onDateChange(option.id);

      const nextValue = replaceToken(
        value,
        activeToken,
        activeToken.trigger === "@" ? `@${option.label} ` : "",
      );
      onChange(nextValue);
      const nextCursor =
        activeToken.start +
        (activeToken.trigger === "@" ? option.label.length + 2 : 0);
      setCursor(nextCursor);
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [
      activeToken,
      onCategoryChange,
      onChange,
      onDateChange,
      onLabelChange,
      onOntologyAssociationChange,
      ontologyAssociations,
      value,
    ],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeToken) return;
    if (event.key === "Escape") {
      setCursor(-1);
      return;
    }
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % options.length);
      return;
    }
    if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + options.length) % options.length);
      return;
    }
    if (
      (event.key === "Enter" || event.key === "Tab") &&
      options[activeIndex]
    ) {
      event.preventDefault();
      selectOption(options[activeIndex]);
    }
  };

  const Icon =
    activeToken?.trigger === "@"
      ? AtSign
      : activeToken?.trigger === "#"
        ? Hash
        : activeToken?.trigger === "$"
          ? Folder
          : CalendarDays;

  return (
    <div className="bg-muted/20 focus-within:border-ring focus-within:ring-ring/50 relative rounded-xl border p-3 focus-within:ring-[3px]">
      <textarea
        ref={textareaRef}
        value={value}
        rows={3}
        placeholder="Add description… Use @ for people or places, # for labels, $ for categories, and ! for dates."
        aria-label="Transaction description"
        className="placeholder:text-muted-foreground min-h-24 w-full resize-y border-0 bg-transparent p-0 text-lg shadow-none outline-none focus-visible:ring-0"
        onChange={(event) => {
          onChange(event.target.value);
          setCursor(event.target.selectionStart);
        }}
        onClick={(event) => setCursor(event.currentTarget.selectionStart)}
        onKeyUp={(event) => setCursor(event.currentTarget.selectionStart)}
        onKeyDown={handleKeyDown}
      />
      <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span>
          <AtSign className="mr-1 inline size-3" />
          Ontology
        </span>
        <span>
          <Hash className="mr-1 inline size-3" />
          Label
        </span>
        <span>
          <Folder className="mr-1 inline size-3" />
          Category
        </span>
        <span>
          <CalendarDays className="mr-1 inline size-3" />
          Natural date
        </span>
      </div>
      {activeToken ? (
        <div className="bg-popover text-popover-foreground absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-lg border p-1 shadow-lg">
          <div className="text-muted-foreground flex items-center gap-2 px-2 py-1.5 text-xs">
            <Icon className="size-3.5" />
            {TRIGGER_LABELS[activeToken.trigger]}
          </div>
          {activeToken.trigger === "@" && activeToken.query.length < 2 ? (
            <p className="text-muted-foreground px-2 py-2 text-sm">
              Type at least 2 characters.
            </p>
          ) : null}
          {isSearching ? (
            <p className="text-muted-foreground px-2 py-2 text-sm">
              Searching…
            </p>
          ) : null}
          {searchFailed ? (
            <p className="text-destructive px-2 py-2 text-sm">
              Search is temporarily unavailable.
            </p>
          ) : null}
          {!isSearching &&
          !searchFailed &&
          activeToken.trigger === "!" &&
          !options.length ? (
            <p className="text-muted-foreground px-2 py-2 text-sm">
              Try “tomorrow”, “next monday”, or “in 2 weeks”.
            </p>
          ) : null}
          {!isSearching &&
          !searchFailed &&
          activeToken.trigger !== "!" &&
          activeToken.query.length > 0 &&
          !options.length ? (
            <p className="text-muted-foreground px-2 py-2 text-sm">
              No matches found.
            </p>
          ) : null}
          {options.map((option, index) => (
            <button
              key={`${option.id}-${option.label}`}
              type="button"
              className={cn(
                "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm",
                index === activeIndex && "bg-accent text-accent-foreground",
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                selectOption(option);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <Search className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate">{option.label}</span>
                {option.subtitle ? (
                  <span className="text-muted-foreground block truncate text-xs">
                    {option.subtitle}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
