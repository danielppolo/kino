"use client";

import * as React from "react";
import clsx from "clsx";
import { Check } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { listTransactionDescriptionSuggestions } from "@/utils/supabase/queries";

export function DescriptionInput({
  value,
  onChange,
  workspaceId,
  variant = "outline",
  limit = 8,
  onBlur,
  onFocus,
  onKeyDown,
  className,
  ...props
}: Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "onChange" | "value"
> & {
  value?: string;
  onChange: (value: string) => void;
  workspaceId?: string;
  variant?: "ghost" | "outline";
  limit?: number;
}) {
  const datalistId = React.useId();
  const normalizedValue = value ?? "";
  const trimmedQuery = normalizedValue.trim();
  const [debouncedQuery, setDebouncedQuery] = React.useState(trimmedQuery);
  const [isFocused, setIsFocused] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [trimmedQuery]);

  const { data: suggestions = [] } = useQuery<string[]>({
    queryKey: [
      "transaction-description-suggestions",
      workspaceId,
      debouncedQuery,
      limit,
    ],
    queryFn: async () => {
      if (!workspaceId || !debouncedQuery) return [];

      const supabase = await createClient();
      const result = await listTransactionDescriptionSuggestions(supabase, {
        workspaceId,
        query: debouncedQuery,
        limit,
      });

      if (result.error) throw result.error;
      return result.data ?? [];
    },
    enabled: Boolean(workspaceId && debouncedQuery),
    staleTime: 1000 * 60 * 5,
  });

  const shouldShowSuggestions =
    isFocused && debouncedQuery.length > 0 && suggestions.length > 0;

  React.useEffect(() => {
    if (!shouldShowSuggestions) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((current) => Math.min(current, suggestions.length - 1));
  }, [shouldShowSuggestions, suggestions.length]);

  const selectSuggestion = React.useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      setActiveIndex(0);
      setIsFocused(false);
    },
    [onChange],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (!shouldShowSuggestions) return;

    if (event.key === "Tab") {
      event.preventDefault();
      selectSuggestion(suggestions[0]);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        current + 1 >= suggestions.length ? 0 : current + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current - 1 < 0 ? suggestions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex] ?? suggestions[0]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsFocused(false);
    }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={normalizedValue}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          window.setTimeout(() => setIsFocused(false), 100);
          onBlur?.(event);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Description"
        className={cn(
          clsx({
            "border-none": variant === "ghost",
          }),
          className,
        )}
        {...props}
      />
      {shouldShowSuggestions && (
        <div
          id={datalistId}
          role="listbox"
          aria-label="Description suggestions"
          className="bg-popover text-popover-foreground absolute top-full z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border shadow-md"
        >
          {suggestions.map((suggestion, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={suggestion}
                type="button"
                role="option"
                aria-selected={isActive}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                  isActive && "bg-accent text-accent-foreground",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSuggestion(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="truncate">{suggestion}</span>
                {isActive && <Check className="ml-2 h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
