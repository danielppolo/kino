"use client";

import * as React from "react";
import { ChevronDown, XCircle } from "lucide-react";

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
import { Tag } from "@/utils/supabase/types";

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

    const groupedOptions = React.useMemo(() => {
      const map: Record<string, Tag[]> = {};
      options.forEach((tag) => {
        const group = tag.group || "Other";
        if (!map[group]) map[group] = [];
        map[group].push(tag);
      });
      Object.values(map).forEach((arr) =>
        arr.sort((a, b) => a.title.localeCompare(b.title)),
      );
      return map;
    }, [options]);

    const toggleOption = (option: string) => {
      if (value.includes(option)) {
        onChange(value.filter((v) => v !== option));
      } else {
        onChange([...value, option]);
      }
    };

    const handleClear = () => onChange([]);

    const filteredGrouped = React.useMemo(() => {
      const q = query.toLowerCase();
      const map: Record<string, Tag[]> = {};
      Object.entries(groupedOptions).forEach(([group, items]) => {
        const filtered = items.filter((t) => t.title.toLowerCase().includes(q));
        if (filtered.length) map[group] = filtered;
      });
      return map;
    }, [groupedOptions, query]);

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
          className="w-auto p-0"
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
              <CommandEmpty>No tags found.</CommandEmpty>
              {Object.entries(filteredGrouped).map(([group, items]) => (
                <CommandGroup
                  key={group}
                  heading={group}
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
