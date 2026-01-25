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
import { Category } from "@/utils/supabase/types";

interface CategoryMultiSelectProps {
  disabled?: boolean;
  value?: string[];
  onChange: (value: string[]) => void;
  options: Category[];
  placeholder?: string;
  className?: string;
}

const CategoryMultiSelect = React.forwardRef<HTMLButtonElement, CategoryMultiSelectProps>(
  (
    {
      disabled,
      value = [],
      onChange,
      options,
      placeholder = "Select categories",
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");

    const groupedOptionsMap: Record<string, Category[]> = {};
    options.forEach((cat) => {
      const group = cat.type || "other";
      if (!groupedOptionsMap[group]) groupedOptionsMap[group] = [];
      groupedOptionsMap[group].push(cat);
    });
    Object.values(groupedOptionsMap).forEach((arr) =>
      arr.sort((a, b) => a.name.localeCompare(b.name)),
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
    const filteredGroupedMap: Record<string, Category[]> = {};
    Object.entries(groupedOptions).forEach(([group, items]) => {
      const filtered = items.filter((c) => c.name.toLowerCase().includes(q));
      if (filtered.length) filteredGroupedMap[group] = filtered;
    });
    const filteredGrouped = filteredGroupedMap;

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
                  {value.map((val) => {
                    const cat = options.find((c) => c.id === val);
                    return (
                      <Badge key={val} className="m-1">
                        {cat?.name ?? val}
                        <XCircle
                          className="ml-2 h-4 w-4 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOption(val);
                          }}
                        />
                      </Badge>
                    );
                  })}
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
              placeholder="Search categories..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>No categories found.</CommandEmpty>
              {Object.entries(filteredGrouped).map(([group, items]) => (
                <CommandGroup key={group} heading={group} className="capitalize">
                  {items.map((cat) => {
                    const selected = value.includes(cat.id);
                    return (
                      <CommandItem
                        key={cat.id}
                        value={cat.name}
                        onSelect={() => toggleOption(cat.id)}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox checked={selected} />
                        <Text as="span">{cat.name}</Text>
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

CategoryMultiSelect.displayName = "CategoryMultiSelect";
export default CategoryMultiSelect;
