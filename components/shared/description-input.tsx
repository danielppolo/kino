"use client";

import * as React from "react";
import clsx from "clsx";

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

  return (
    <>
      <Input
        type="text"
        value={normalizedValue}
        onChange={(event) => onChange(event.target.value)}
        list={suggestions.length > 0 ? datalistId : undefined}
        placeholder="Description"
        className={cn(
          clsx({
            "border-none": variant === "ghost",
          }),
        )}
        {...props}
      />
      {suggestions.length > 0 && (
        <datalist id={datalistId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
    </>
  );
}
