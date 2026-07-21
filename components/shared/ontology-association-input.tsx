"use client";

import * as React from "react";
import { MapPin, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type OntologyAssociationItem } from "@/utils/ontology-associations";

export type OntologyAssociationInputToken =
  | {
      id: string;
      type: "text";
      text: string;
    }
  | (OntologyAssociationItem & {
      tokenType: "association";
    });

interface OntologyAssociationInputProps {
  value?: OntologyAssociationInputToken[];
  onChange?: (tokens: OntologyAssociationInputToken[]) => void;
  placeholder?: string;
  className?: string;
}

type ActiveMention = {
  tokenId: string;
  start: number;
  end: number;
  query: string;
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function createTextToken(text = ""): OntologyAssociationInputToken {
  return {
    id: createId("text"),
    type: "text",
    text,
  };
}

function findMention(text: string, cursor: number): ActiveMention | null {
  const beforeCursor = text.slice(0, cursor);
  const tokenStart = beforeCursor.search(/\S+$/);

  if (tokenStart === -1 || beforeCursor[tokenStart] !== "@") {
    return null;
  }

  const query = beforeCursor.slice(tokenStart + 1);

  if (/\s/.test(query)) {
    return null;
  }

  return {
    tokenId: "",
    start: tokenStart,
    end: cursor,
    query,
  };
}

function removeAssociationAt(
  tokens: OntologyAssociationInputToken[],
  index: number,
) {
  const next = [...tokens];
  next.splice(index, 1);

  if (next.length === 0) {
    return [createTextToken()];
  }

  return next;
}

function insertAssociation(
  tokens: OntologyAssociationInputToken[],
  mention: ActiveMention,
  item: OntologyAssociationItem,
) {
  const index = tokens.findIndex((token) => token.id === mention.tokenId);
  const token = tokens[index];

  if (!token || token.type !== "text") {
    return tokens;
  }

  const before = token.text.slice(0, mention.start);
  const after = token.text.slice(mention.end);
  const trailingText = after.startsWith(" ") ? after : ` ${after}`;
  const nextTokens: OntologyAssociationInputToken[] = [
    ...tokens.slice(0, index),
    ...(before ? [createTextToken(before)] : []),
    {
      ...item,
      tokenType: "association",
    },
    createTextToken(trailingText),
    ...tokens.slice(index + 1),
  ];

  return nextTokens;
}

export function OntologyAssociationInput({
  value,
  onChange,
  placeholder = "Add a note. Type @ to associate a person or place...",
  className,
}: OntologyAssociationInputProps) {
  const [internalTokens, setInternalTokens] = React.useState<
    OntologyAssociationInputToken[]
  >([createTextToken()]);
  const [activeMention, setActiveMention] =
    React.useState<ActiveMention | null>(null);
  const [items, setItems] = React.useState<OntologyAssociationItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const inputRefs = React.useRef(new Map<string, HTMLInputElement>());
  const tokens = value ?? internalTokens;

  const updateTokens = React.useCallback(
    (nextTokens: OntologyAssociationInputToken[]) => {
      if (value === undefined) {
        setInternalTokens(nextTokens);
      }

      onChange?.(nextTokens);
    },
    [onChange, value],
  );

  React.useEffect(() => {
    if (!activeMention || activeMention.query.length < 2) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetch(
      `/api/ontology-associations/search?q=${encodeURIComponent(
        activeMention.query,
      )}&limit=8`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Search failed");
        }

        return response.json() as Promise<{ items?: OntologyAssociationItem[] }>;
      })
      .then((data) => setItems(data.items ?? []))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setItems([]);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [activeMention]);

  function updateTextToken(
    tokenId: string,
    text: string,
    selectionStart: number | null,
  ) {
    const cursor = selectionStart ?? text.length;
    const mention = findMention(text, cursor);

    updateTokens(
      tokens.map((token) =>
        token.id === tokenId && token.type === "text"
          ? { ...token, text }
          : token,
      ),
    );
    setActiveMention(mention ? { ...mention, tokenId } : null);
  }

  function handleSelect(item: OntologyAssociationItem) {
    if (!activeMention) {
      return;
    }

    const nextTokens = insertAssociation(tokens, activeMention, item);
    updateTokens(nextTokens);
    setActiveMention(null);
    setItems([]);

    window.setTimeout(() => {
      const textToken = nextTokens.find(
        (token, index) => token.type === "text" && index > 0,
      );

      if (textToken?.type === "text") {
        inputRefs.current.get(textToken.id)?.focus();
      }
    }, 0);
  }

  function handleBackspace(
    event: React.KeyboardEvent<HTMLInputElement>,
    tokenIndex: number,
  ) {
    const input = event.currentTarget;
    const previousToken = tokens[tokenIndex - 1];

    if (
      event.key === "Backspace" &&
      input.selectionStart === 0 &&
      input.selectionEnd === 0 &&
      previousToken?.type !== "text"
    ) {
      event.preventDefault();
      updateTokens(removeAssociationAt(tokens, tokenIndex - 1));
      setActiveMention(null);
      setItems([]);
    }
  }

  const hasVisibleValue = tokens.some((token) =>
    token.type === "text" ? token.text.length > 0 : true,
  );

  return (
    <div className={cn("relative", className)}>
      <div className="border-input bg-background focus-within:ring-ring flex min-h-28 flex-wrap content-start items-center gap-x-1.5 gap-y-1.5 rounded-lg border px-3 py-2.5 text-sm shadow-xs transition-[border-color,box-shadow] focus-within:ring-2 focus-within:ring-offset-2">
        {!hasVisibleValue ? (
          <span className="text-muted-foreground pointer-events-none absolute px-0.5 py-0.5">
            {placeholder}
          </span>
        ) : null}

        {tokens.map((token, index) =>
          token.type === "text" ? (
            <input
              aria-label="Association note text"
              className="placeholder:text-muted-foreground min-w-24 flex-[1_1_12rem] self-center bg-transparent px-0.5 py-0.5 leading-5 outline-hidden"
              key={token.id}
              ref={(node) => {
                if (node) {
                  inputRefs.current.set(token.id, node);
                } else {
                  inputRefs.current.delete(token.id);
                }
              }}
              value={token.text}
              onChange={(event) =>
                updateTextToken(
                  token.id,
                  event.target.value,
                  event.target.selectionStart,
                )
              }
              onClick={(event) =>
                updateTextToken(
                  token.id,
                  token.text,
                  event.currentTarget.selectionStart,
                )
              }
              onKeyDown={(event) => handleBackspace(event, index)}
            />
          ) : (
            <span
              className={cn(
                "inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-1.5 text-xs font-medium leading-none shadow-xs",
                token.type === "person"
                  ? "border-blue-200 bg-blue-50 text-blue-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900",
              )}
              key={`${token.type}-${token.id}-${index}`}
            >
              {token.type === "person" ? (
                <UserRound className="size-3 shrink-0" />
              ) : (
                <MapPin className="size-3 shrink-0" />
              )}
              {token.name}
              <button
                aria-label={`Remove ${token.name}`}
                className="-mr-0.5 rounded-sm p-0.5 opacity-60 transition-opacity hover:bg-black/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
                type="button"
                onClick={() => updateTokens(removeAssociationAt(tokens, index))}
              >
                <X className="size-3" />
              </button>
            </span>
          ),
        )}
      </div>

      {activeMention?.query && activeMention.query.length < 2 ? (
        <div className="bg-popover text-muted-foreground absolute z-20 mt-2 w-full rounded-lg border p-2.5 text-sm shadow-md">
          Type at least 2 characters after @.
        </div>
      ) : null}

      {activeMention && activeMention.query.length >= 2 ? (
        <div className="bg-popover absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-lg border p-1 shadow-md">
          {isLoading ? (
            <div className="text-muted-foreground px-3 py-2 text-sm">
              Searching...
            </div>
          ) : null}

          {!isLoading && items.length === 0 ? (
            <div className="text-muted-foreground px-3 py-2 text-sm">
              No people or places found.
            </div>
          ) : null}

          {items.map((item) => (
            <Button
              className="h-auto w-full justify-start gap-2 rounded-md px-2.5 py-2 text-sm"
              key={`${item.type}-${item.id}`}
              type="button"
              variant="ghost"
              onClick={() => handleSelect(item)}
            >
              {item.type === "person" ? (
                <UserRound className="size-4 text-blue-600" />
              ) : (
                <MapPin className="size-4 text-emerald-600" />
              )}
              <span className="min-w-0 text-left">
                <span className="block truncate">{item.name}</span>
                {item.subtitle ? (
                  <span className="text-muted-foreground block truncate text-xs">
                    {item.subtitle}
                  </span>
                ) : null}
              </span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
