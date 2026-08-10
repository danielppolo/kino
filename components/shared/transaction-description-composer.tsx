"use client";

import * as React from "react";
import * as chrono from "chrono-node";
import { format } from "date-fns";
import {
  AtSign,
  Building2,
  CalendarDays,
  Folder,
  Hash,
  MapPin,
  Plane,
  UserRound,
} from "lucide-react";
import { createPortal } from "react-dom";

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

type InlineToken = {
  key: string;
  text: string;
  className: string;
};

type TokenRange = InlineToken & {
  start: number;
  end: number;
};

interface TransactionDescriptionComposerProps {
  value: string;
  onChange: (value: string) => void;
  workspaceId?: string;
  type: "income" | "expense" | "transfer";
  disabledTriggers?: readonly Trigger[];
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

const ONTOLOGY_TYPE_ICONS = {
  organization: Building2,
  person: UserRound,
  place: MapPin,
  trip: Plane,
} as const;

const NO_DISABLED_TRIGGERS: readonly Trigger[] = [];

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

function hasInlineToken(value: string, token: string) {
  let index = value.indexOf(token);
  while (index >= 0) {
    const before = value[index - 1];
    const after = value[index + token.length];
    if ((!before || /\s/.test(before)) && (!after || /\s/.test(after))) {
      return true;
    }
    index = value.indexOf(token, index + token.length);
  }
  return false;
}

function removeInlineToken(value: string, token: string) {
  let nextValue = value;
  let index = nextValue.indexOf(token);

  while (index >= 0) {
    const before = nextValue[index - 1];
    const after = nextValue[index + token.length];
    const hasBoundaryBefore = !before || /\s/.test(before);
    const hasBoundaryAfter = !after || /\s/.test(after);

    if (hasBoundaryBefore && hasBoundaryAfter) {
      const removeStart = index > 0 && before === " " ? index - 1 : index;
      const removeEnd =
        after === " " ? index + token.length + 1 : index + token.length;
      const separator =
        removeStart > 0 && removeEnd < nextValue.length ? " " : "";
      nextValue = `${nextValue.slice(0, removeStart)}${separator}${nextValue.slice(removeEnd)}`;
      index = nextValue.indexOf(token, removeStart + separator.length);
      continue;
    }

    index = nextValue.indexOf(token, index + token.length);
  }

  return nextValue;
}

function removeInlineTokenRange(value: string, range: TokenRange) {
  let start = range.start;
  let end = range.end;

  if (
    value[end] === " " &&
    end + 1 === value.length &&
    start > 0 &&
    value[start - 1] === " "
  ) {
    start -= 1;
    end += 1;
  } else if (value[end] === " ") end += 1;
  else if (start > 0 && value[start - 1] === " ") start -= 1;

  return {
    cursor: start,
    value: `${value.slice(0, start)}${value.slice(end)}`,
  };
}

function getTokenRanges(value: string, tokens: InlineToken[]) {
  const ranges: TokenRange[] = [];

  for (const token of tokens) {
    let index = value.indexOf(token.text);
    while (index >= 0) {
      const before = value[index - 1];
      const after = value[index + token.text.length];
      if ((!before || /\s/.test(before)) && (!after || /\s/.test(after))) {
        ranges.push({
          ...token,
          start: index,
          end: index + token.text.length,
        });
      }
      index = value.indexOf(token.text, index + token.text.length);
    }
  }

  return ranges.sort((left, right) => left.start - right.start);
}

function HighlightedDescription({
  value,
  activeToken,
  inlineTokens,
  anchorRef,
}: {
  value: string;
  activeToken: ActiveToken | null;
  inlineTokens: InlineToken[];
  anchorRef: React.Ref<HTMLSpanElement>;
}) {
  const ranges = getTokenRanges(value, inlineTokens);
  if (activeToken) {
    ranges.push({
      key: "active-command",
      text: value.slice(activeToken.start, activeToken.end),
      className: COMMAND_META[activeToken.trigger].activeClassName,
      start: activeToken.start,
      end: activeToken.end,
    });
    ranges.sort(
      (left, right) =>
        left.start - right.start || (left.key === "active-command" ? -1 : 1),
    );
  }

  const content: React.ReactNode[] = [];
  let offset = 0;
  for (const range of ranges) {
    if (range.start < offset) continue;
    if (range.start > offset) content.push(value.slice(offset, range.start));
    content.push(
      <React.Fragment key={`${range.key}-${range.start}`}>
        <span
          className={cn("rounded-[3px] box-decoration-clone", range.className)}
        >
          {value.slice(range.start, range.end)}
        </span>
        {range.key === "active-command" ? (
          <span
            ref={anchorRef}
            className="inline-block h-[1em] w-0 align-text-bottom"
          />
        ) : null}
      </React.Fragment>,
    );
    offset = range.end;
  }
  content.push(value.slice(offset) || (offset === 0 ? "\u200b" : ""));
  return <>{content}</>;
}

export function TransactionDescriptionComposer({
  value,
  onChange,
  workspaceId,
  type,
  disabledTriggers = NO_DISABLED_TRIGGERS,
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
  const commandAnchorRef = React.useRef<HTMLSpanElement>(null);
  const suggestionRef = React.useRef<HTMLDivElement>(null);
  const suggestionId = React.useId();
  const [cursor, setCursor] = React.useState(value.length);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [suggestionPosition, setSuggestionPosition] = React.useState({
    left: 0,
    maxHeight: 320,
    top: 0,
    width: 320,
  });
  const [ontologyItems, setOntologyItems] = React.useState<
    OntologyAssociationItem[]
  >([]);
  const [trackedDateToken, setTrackedDateToken] = React.useState<{
    date: string;
    text: string;
  } | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchFailed, setSearchFailed] = React.useState(false);
  const [categories] = useCategories();
  const [labels] = useLabels();
  const parsedActiveToken = getActiveToken(value, cursor);
  const activeToken =
    parsedActiveToken && !disabledTriggers.includes(parsedActiveToken.trigger)
      ? parsedActiveToken
      : null;
  const activeTokenStart = activeToken?.start;
  const activeTokenEnd = activeToken?.end;
  const activeTokenTrigger = activeToken?.trigger;
  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );
  const selectedLabel = labels.find((label) => label.id === labelId);
  const activeCommand = activeToken ? COMMAND_META[activeToken.trigger] : null;
  const formattedDateToken = date
    ? `!${format(new Date(`${date}T00:00:00`), "EEEE, MMMM d")}`
    : undefined;
  const naturalDate = date ? findTrailingNaturalDate(value) : null;
  const inlineDateToken =
    formattedDateToken && hasInlineToken(value, formattedDateToken)
      ? formattedDateToken
      : trackedDateToken?.date === date &&
          hasInlineToken(value, trackedDateToken.text)
        ? trackedDateToken.text
        : naturalDate && format(naturalDate.date, "yyyy-MM-dd") === date
          ? value.slice(naturalDate.start, naturalDate.end)
          : undefined;
  const inlineTokens = React.useMemo<InlineToken[]>(
    () => [
      ...ontologyAssociations.map((association) => ({
        key: `ontology-${association.type}-${association.ontologyId}`,
        text: `@${association.name}`,
        className: COMMAND_META["@"].activeClassName,
      })),
      ...(selectedLabel
        ? [
            {
              key: `label-${selectedLabel.id}`,
              text: `#${selectedLabel.name}`,
              className: COMMAND_META["#"].activeClassName,
            },
          ]
        : []),
      ...(selectedCategory
        ? [
            {
              key: `category-${selectedCategory.id}`,
              text: `$${selectedCategory.name}`,
              className: COMMAND_META["$"].activeClassName,
            },
          ]
        : []),
      ...(inlineDateToken
        ? [
            {
              key: `date-${date}`,
              text: inlineDateToken,
              className: COMMAND_META["!"].activeClassName,
            },
          ]
        : []),
    ],
    [
      date,
      inlineDateToken,
      ontologyAssociations,
      selectedCategory,
      selectedLabel,
    ],
  );
  const previousTokensRef = React.useRef(inlineTokens);

  React.useEffect(() => {
    const currentKeys = new Set(inlineTokens.map((token) => token.key));
    const removedTokens = previousTokensRef.current.filter(
      (token) => !currentKeys.has(token.key),
    );
    previousTokensRef.current = inlineTokens;
    if (!removedTokens.length) return;

    const nextValue = removedTokens.reduce(
      (description, token) => removeInlineToken(description, token.text),
      value,
    );
    if (nextValue === value) return;

    onChange(nextValue);
    setCursor((current) => Math.min(current, nextValue.length));
  }, [inlineTokens, onChange, value]);

  React.useEffect(() => {
    if (
      trackedDateToken &&
      (trackedDateToken.date !== date ||
        !hasInlineToken(value, trackedDateToken.text))
    ) {
      setTrackedDateToken(null);
    }
  }, [date, trackedDateToken, value]);

  const updateSuggestionPosition = React.useCallback(() => {
    const anchor = commandAnchorRef.current;
    if (!anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.min(448, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(anchorRect.left, viewportPadding),
      window.innerWidth - width - viewportPadding,
    );
    const top = anchorRect.bottom + 6;
    setSuggestionPosition({
      left,
      maxHeight: Math.max(120, window.innerHeight - top - viewportPadding),
      top,
      width,
    });
  }, []);

  React.useLayoutEffect(() => {
    if (activeTokenStart === undefined) return;

    updateSuggestionPosition();
    const frame = window.requestAnimationFrame(updateSuggestionPosition);
    window.addEventListener("resize", updateSuggestionPosition);
    window.addEventListener("scroll", updateSuggestionPosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateSuggestionPosition);
      window.removeEventListener("scroll", updateSuggestionPosition, true);
    };
  }, [
    activeTokenEnd,
    activeTokenStart,
    activeTokenTrigger,
    updateSuggestionPosition,
    value,
  ]);

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
        subtitle: association.type,
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
      let replacement = "";
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
        replacement = isDuplicate ? "" : `@${option.label} `;
      }
      if (activeToken.trigger === "#") {
        onLabelChange(option.id);
        replacement = `#${option.label} `;
      }
      if (activeToken.trigger === "$") {
        onCategoryChange(option.id);
        replacement = `$${option.label} `;
      }
      if (activeToken.trigger === "!") {
        setTrackedDateToken(null);
        onDateChange(option.id);
        replacement = `!${option.label} `;
      }

      const nextValue = replaceToken(value, activeToken, replacement);
      onChange(nextValue);
      const nextCursor = activeToken.start + replacement.length;
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
    if (event.key === "Backspace") {
      const selectionStart = event.currentTarget.selectionStart;
      const selectionEnd = event.currentTarget.selectionEnd;
      const tokenRange = getTokenRanges(value, inlineTokens).find((range) => {
        if (selectionStart !== selectionEnd) {
          return selectionStart < range.end && selectionEnd > range.start;
        }
        return (
          (selectionStart > range.start && selectionStart <= range.end) ||
          (selectionStart === range.end + 1 && value[range.end] === " ")
        );
      });

      if (tokenRange) {
        event.preventDefault();
        if (tokenRange.key.startsWith("ontology-")) {
          onOntologyAssociationChange(
            ontologyAssociations.filter(
              (association) =>
                `ontology-${association.type}-${association.ontologyId}` !==
                tokenRange.key,
            ),
          );
        } else if (tokenRange.key.startsWith("label-")) {
          onLabelChange("");
        } else if (tokenRange.key.startsWith("category-")) {
          onCategoryChange("");
        } else if (tokenRange.key.startsWith("date-")) {
          setTrackedDateToken(null);
          onDateChange("");
        }

        const nextDescription = removeInlineTokenRange(value, tokenRange);
        onChange(nextDescription.value);
        setCursor(nextDescription.cursor);
        window.requestAnimationFrame(() => {
          textareaRef.current?.setSelectionRange(
            nextDescription.cursor,
            nextDescription.cursor,
          );
        });
        return;
      }
    }

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
    const removedAssociations = ontologyAssociations.filter((association) => {
      const token = `@${association.name}`;
      return hasInlineToken(value, token) && !hasInlineToken(nextValue, token);
    });
    if (removedAssociations.length) {
      const removedKeys = new Set(
        removedAssociations.map(
          (association) => `${association.type}:${association.ontologyId}`,
        ),
      );
      onOntologyAssociationChange(
        ontologyAssociations.filter(
          (association) =>
            !removedKeys.has(`${association.type}:${association.ontologyId}`),
        ),
      );
    }
    if (
      selectedLabel &&
      hasInlineToken(value, `#${selectedLabel.name}`) &&
      !hasInlineToken(nextValue, `#${selectedLabel.name}`)
    ) {
      onLabelChange("");
    }
    if (
      selectedCategory &&
      hasInlineToken(value, `$${selectedCategory.name}`) &&
      !hasInlineToken(nextValue, `$${selectedCategory.name}`)
    ) {
      onCategoryChange("");
    }
    const dateTokenRemoved = Boolean(
      inlineDateToken &&
        hasInlineToken(value, inlineDateToken) &&
        !hasInlineToken(nextValue, inlineDateToken),
    );
    if (dateTokenRemoved) {
      setTrackedDateToken(null);
      onDateChange("");
    }

    const detectedDate = findTrailingNaturalDate(nextValue);
    if (detectedDate && !dateTokenRemoved && activeToken?.trigger !== "!") {
      const detectedDateValue = format(detectedDate.date, "yyyy-MM-dd");
      setTrackedDateToken({
        date: detectedDateValue,
        text: nextValue.slice(detectedDate.start, detectedDate.end),
      });
      if (detectedDateValue !== date) onDateChange(detectedDateValue);
    }

    onChange(nextValue);
    setCursor(event.target.selectionStart);
  };

  return (
    <div className="bg-muted/20 focus-within:border-ring focus-within:ring-ring/50 relative rounded-2xl border p-3.5 shadow-sm transition-shadow focus-within:ring-[3px]">
      <div className="relative min-h-24">
        <div
          ref={highlightRef}
          aria-hidden="true"
          className="text-foreground pointer-events-none absolute inset-0 overflow-hidden pr-1 text-lg leading-7 break-words whitespace-pre-wrap"
        >
          <HighlightedDescription
            value={value}
            activeToken={activeToken}
            inlineTokens={inlineTokens}
            anchorRef={commandAnchorRef}
          />
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          rows={3}
          placeholder={
            disabledTriggers.includes("$")
              ? "What was this for? Try @, #, or a date like 7 Jul…"
              : "What was this for? Try @, #, $, or a date like 7 Jul…"
          }
          aria-label="Transaction description"
          aria-autocomplete="list"
          aria-controls={activeToken ? suggestionId : undefined}
          aria-expanded={Boolean(activeToken)}
          aria-activedescendant={
            activeToken && options[activeIndex]
              ? `${suggestionId}-option-${activeIndex}`
              : undefined
          }
          autoComplete="off"
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
      {activeToken && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={suggestionRef}
              id={suggestionId}
              aria-live="polite"
              className="bg-popover text-popover-foreground fixed z-[100] overflow-y-auto rounded-xl border p-1.5 shadow-2xl"
              style={suggestionPosition}
            >
              <div className="text-muted-foreground flex items-center gap-2 px-2 py-2 text-xs">
                {activeCommand ? (
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-md",
                      activeCommand.activeClassName,
                    )}
                  >
                    <activeCommand.Icon
                      aria-hidden="true"
                      className="size-3.5"
                    />
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
              <div role="listbox" aria-label={activeCommand?.label}>
                {options.map((option, index) => {
                  const OptionIcon = option.association
                    ? ONTOLOGY_TYPE_ICONS[option.association.type]
                    : activeCommand?.Icon;
                  return (
                    <button
                      id={`${suggestionId}-option-${index}`}
                      key={`${option.id}-${option.label}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className={cn(
                        "focus-visible:ring-ring flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none",
                        index === activeIndex &&
                          "bg-accent text-accent-foreground",
                      )}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectOption(option);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      {OptionIcon ? (
                        <OptionIcon
                          aria-hidden="true"
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            activeCommand?.iconClassName,
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
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
