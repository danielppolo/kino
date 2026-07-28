"use client";

import * as React from "react";
import * as chrono from "chrono-node";
import { format } from "date-fns";
import { AtSign, CalendarDays, Folder, Hash } from "lucide-react";

import { useCategories, useLabels } from "@/contexts/settings-context";
import { cn } from "@/lib/utils";
import { type OntologyAssociationItem } from "@/utils/ontology-associations";

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
  categoryId: string;
  labelId: string;
  date: string;
}

const TRIGGER_LABELS: Record<Trigger, string> = {
  "@": "Search people, places, organizations, or trips",
  "#": "Select a label",
  $: "Select a category",
  "!": "Set a date in natural language",
};

const COMMAND_META: Record<
  Trigger,
  {
    label: string;
    Icon: typeof AtSign;
    activeClassName: string;
    iconClassName: string;
  }
> = {
  "@": {
    label: "Association",
    Icon: AtSign,
    activeClassName: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    iconClassName: "text-sky-700 dark:text-sky-300",
  },
  "#": {
    label: "Label",
    Icon: Hash,
    activeClassName: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    iconClassName: "text-violet-700 dark:text-violet-300",
  },
  $: {
    label: "Category",
    Icon: Folder,
    activeClassName: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    iconClassName: "text-amber-800 dark:text-amber-300",
  },
  "!": {
    label: "Date",
    Icon: CalendarDays,
    activeClassName: "bg-teal-500/15 text-teal-800 dark:text-teal-300",
    iconClassName: "text-teal-800 dark:text-teal-300",
  },
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
  return chrono.casual.parseDate(input, referenceDate, { forwardDate: true });
}

function findTrailingNaturalDate(value: string) {
  const lastResult = chrono.casual
    .parse(value, new Date(), { forwardDate: true })
    .at(-1);
  if (!lastResult) return null;

  const end = lastResult.index + lastResult.text.length;
  if (end !== value.trimEnd().length) return null;
  return { date: lastResult.start.date(), start: lastResult.index, end };
}

function replaceToken(value: string, token: ActiveToken, replacement = "") {
  return `${value.slice(0, token.start)}${replacement}${value.slice(token.end)}`;
}

function HighlightedDescription({
  value,
  activeToken,
}: {
  value: string;
  activeToken: ActiveToken | null;
}) {
  if (!activeToken) return <>{value || "\u200b"}</>;

  const command = value.slice(activeToken.start, activeToken.end);
  return (
    <>
      {value.slice(0, activeToken.start)}
      <span
        className={cn(
          "rounded-md px-0.5 py-px font-medium",
          COMMAND_META[activeToken.trigger].activeClassName,
        )}
      >
        {command}
      </span>
      {value.slice(activeToken.end)}
    </>
  );
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
  categoryId,
  labelId,
  date,
}: TransactionDescriptionComposerProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const highlightRef = React.useRef<HTMLDivElement>(null);
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
  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );
  const selectedLabel = labels.find((label) => label.id === labelId);
  const activeCommand = activeToken ? COMMAND_META[activeToken.trigger] : null;

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

  const handleDescriptionChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const nextValue = event.target.value;
    const detectedDate = findTrailingNaturalDate(nextValue);
    if (!detectedDate) {
      onChange(nextValue);
      setCursor(event.target.selectionStart);
      return;
    }

    onDateChange(format(detectedDate.date, "yyyy-MM-dd"));
    const description = `${nextValue.slice(0, detectedDate.start)}${nextValue.slice(
      detectedDate.end,
    )}`;
    const nextCursor = detectedDate.start;
    onChange(description);
    setCursor(nextCursor);
    window.requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <div className="bg-muted/20 focus-within:border-ring focus-within:ring-ring/50 relative rounded-2xl border p-3.5 shadow-sm transition-shadow focus-within:ring-[3px]">
      <div className="relative min-h-24">
        <div
          ref={highlightRef}
          aria-hidden="true"
          className="text-foreground pointer-events-none absolute inset-0 overflow-hidden pr-1 text-lg leading-7 break-words whitespace-pre-wrap"
        >
          <HighlightedDescription value={value} activeToken={activeToken} />
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          rows={3}
          placeholder="What was this for? Try @, #, $, or a date like 7 Jul"
          aria-label="Transaction description"
          className="caret-foreground placeholder:text-muted-foreground selection:bg-primary/20 relative z-10 min-h-24 w-full resize-y border-0 bg-transparent p-0 pr-1 text-lg leading-7 text-transparent shadow-none outline-none focus-visible:ring-0"
          onChange={handleDescriptionChange}
          onClick={(event) => setCursor(event.currentTarget.selectionStart)}
          onKeyUp={(event) => setCursor(event.currentTarget.selectionStart)}
          onKeyDown={handleKeyDown}
          onScroll={(event) => {
            const textarea = event.currentTarget;
            if (highlightRef.current) {
              highlightRef.current.scrollTop = textarea.scrollTop;
              highlightRef.current.scrollLeft = textarea.scrollLeft;
            }
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
        {ontologyAssociations.map((association) => (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-800 dark:text-sky-200"
            key={`${association.type}-${association.ontologyId}`}
          >
            <AtSign className="size-3" />
            {association.name}
          </span>
        ))}
        {selectedLabel ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-800 dark:text-violet-200">
            <Hash className="size-3" />
            {selectedLabel.name}
          </span>
        ) : null}
        {selectedCategory ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-900 dark:text-amber-200">
            <Folder className="size-3" />
            {selectedCategory.name}
          </span>
        ) : null}
        {date ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-900 dark:text-teal-200">
            <CalendarDays className="size-3" />
            {format(new Date(`${date}T00:00:00`), "MMM d, yyyy")}
          </span>
        ) : null}
        {!ontologyAssociations.length && !selectedLabel && !selectedCategory ? (
          <span className="text-muted-foreground px-1 py-1 text-xs">
            Type{" "}
            <kbd className="bg-background rounded border px-1 font-mono">@</kbd>{" "}
            association,{" "}
            <kbd className="bg-background rounded border px-1 font-mono">#</kbd>{" "}
            label, or{" "}
            <kbd className="bg-background rounded border px-1 font-mono">$</kbd>{" "}
            category
          </span>
        ) : null}
      </div>
      {activeToken ? (
        <div className="bg-popover text-popover-foreground absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border p-1.5 shadow-xl">
          <div className="text-muted-foreground flex items-center gap-2 px-2 py-2 text-xs">
            {activeCommand ? (
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-md",
                  activeCommand.activeClassName,
                )}
              >
                <activeCommand.Icon className="size-3.5" />
              </span>
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="text-foreground block font-medium">
                {activeCommand?.label}
              </span>
              <span className="block truncate">
                {TRIGGER_LABELS[activeToken.trigger]}
              </span>
            </span>
            <kbd className="bg-muted rounded border px-1.5 py-0.5 font-mono text-[10px]">
              {activeToken.trigger}
            </kbd>
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
              {activeCommand ? (
                <activeCommand.Icon
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0",
                    activeCommand.iconClassName,
                  )}
                />
              ) : null}
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
