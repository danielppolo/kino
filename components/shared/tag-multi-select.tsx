"use client";

import * as React from "react";
import {
  CalendarFold,
  ChevronDown,
  HandCoins,
  HandPlatter,
  Handshake,
  HeartPlus,
  Map,
  PencilRuler,
  PiggyBank,
  Plus,
  User,
  XCircle,
} from "lucide-react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";
import { Text } from "../ui/typography";

import { cn } from "@/lib/utils";
import { Database } from "@/utils/supabase/database.types";
import { createTag } from "@/utils/supabase/mutations";
import { Tag } from "@/utils/supabase/types";

const ICONS = {
  doctor: <HeartPlus className="size-4" />,
  empresa: <Handshake className="size-4" />,
  evento: <CalendarFold className="size-4" />,
  finanzas: <PiggyBank className="size-4" />,
  persona: <User className="size-4" />,
  proyecto: <PencilRuler className="size-4" />,
  servicio: <HandPlatter className="size-4" />,
  viaje: <Map className="size-4" />,
};

function CommandAddItem({
  query,
  onCreate,
}: {
  query: string;
  onCreate: () => void;
}) {
  return (
    <div
      tabIndex={0}
      onClick={onCreate}
      className={cn(
        "hover:bg-accent hover:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      )}
    >
      <Plus className="mr-2 h-4 w-4" />
      &ldquo;{query}&rdquo;
    </div>
  );
}

interface TagMultiSelectProps {
  disabled?: boolean;
  value?: string[];
  onChange: (value: string[]) => void;
  options: Tag[];
  placeholder?: string;
  className?: string;
}

const TagMultiSelect = React.forwardRef<HTMLButtonElement, TagMultiSelectProps>(
  (
    {
      disabled,
      value = [],
      onChange,
      options,
      placeholder = "Select tags",
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");

    const queryClient = useQueryClient();
    const createMutation = useMutation({
      mutationFn: async (title: string) => {
        const values: Database["public"]["Tables"]["tags"]["Insert"] = {
          title,
        };
        const result = await createTag(values);
        return result[0];
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tags"] });
      },
    });

    const groupedOptionsMap: Record<string, Tag[]> = {};
    options.forEach((tag) => {
      const group = tag.group || "Other";
      if (!groupedOptionsMap[group]) groupedOptionsMap[group] = [];
      groupedOptionsMap[group].push(tag);
    });
    Object.values(groupedOptionsMap).forEach((arr) =>
      arr.sort((a, b) => a.title.localeCompare(b.title)),
    );
    const groupedOptions = groupedOptionsMap;

    const toggleOption = (option: string) => {
      if (value.includes(option)) {
        onChange(value.filter((v) => v !== option));
      } else {
        onChange([...value, option]);
      }
    };

    const handleClear = () => onChange([]);

    const q = query.toLowerCase();
    const filteredGroupedMap: Record<string, Tag[]> = {};
    Object.entries(groupedOptions).forEach(([group, items]) => {
      const filtered = items.filter((t) => t.title.toLowerCase().includes(q));
      if (filtered.length) filteredGroupedMap[group] = filtered;
    });
    const filteredGrouped = filteredGroupedMap;

    const canCreate = !query.trim()
      ? false
      : !options.some(
          (t) => t.title.toLowerCase() === query.trim().toLowerCase(),
        );

    const handleCreate = async () => {
      const title = query.trim();
      if (!title) return;
      const newTag = await createMutation.mutateAsync(title);
      if (newTag) {
        onChange([...value, newTag.id]);
      }
      setOpen(false);
      setQuery("");
    };

    return (
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant="outline"
            className={cn(
              "flex h-auto min-h-10 w-full items-center justify-between rounded-md p-1",
              className,
            )}
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
          >
            {value.length > 0 ? (
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-wrap items-center">
                  {value.map((val) => (
                    <Badge key={val} className="m-1">
                      {options.find((o) => o.id === val)?.title ?? val}
                      <XCircle
                        className="ml-2 h-4 w-4 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleOption(val);
                        }}
                      />
                    </Badge>
                  ))}
                </div>
                <ChevronDown className="text-muted-foreground mx-2 h-4 cursor-pointer" />
              </div>
            ) : (
              <div className="mx-auto flex w-full items-center justify-between">
                <span className="text-muted-foreground mx-3 text-sm">
                  {placeholder}
                </span>
                <ChevronDown className="text-muted-foreground mx-2 h-4 cursor-pointer" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[200px] p-0"
          align="start"
          onEscapeKeyDown={() => setOpen(false)}
        >
          <Command shouldFilter={false} className="w-48">
            <CommandInput
              placeholder="Search tags..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {query && canCreate ? (
                  <CommandAddItem query={query} onCreate={handleCreate} />
                ) : (
                  "No tags found."
                )}
              </CommandEmpty>
              {Object.entries(filteredGrouped).map(([group, items]) => (
                <CommandGroup
                  key={group}
                  heading={
                    <div className="flex items-center gap-2">
                      {ICONS[group]}
                      <Text className="text-muted-foreground">{group}</Text>
                    </div>
                  }
                  className="capitalize"
                >
                  {items.map((tag) => {
                    const selected = value.includes(tag.id);
                    return (
                      <CommandItem
                        key={tag.id}
                        value={tag.title}
                        onSelect={() => toggleOption(tag.id)}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox checked={selected} />
                        <Text as="span">{tag.title}</Text>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
              {query && canCreate && (
                <CommandAddItem query={query} onCreate={handleCreate} />
              )}
              <CommandGroup>
                <div className="flex items-center justify-between">
                  {value.length > 0 && (
                    <>
                      <CommandItem
                        onSelect={handleClear}
                        className="flex-1 cursor-pointer justify-center"
                      >
                        Clear
                      </CommandItem>
                      <Separator
                        orientation="vertical"
                        className="flex h-full min-h-6"
                      />
                    </>
                  )}
                  <CommandItem
                    onSelect={() => setOpen(false)}
                    className="max-w-full flex-1 cursor-pointer justify-center"
                  >
                    Close
                  </CommandItem>
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

TagMultiSelect.displayName = "TagMultiSelect";
export default TagMultiSelect;
