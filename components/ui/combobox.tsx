"use client";

import * as React from "react";
import { Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  keywords?: string[];
}

interface ComboboxProps {
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
  size?: "sm" | "default" | "lg";
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  icon?: React.ReactNode;
  renderValue?: (option: ComboboxOption | undefined) => React.ReactNode;
  renderOption?: (option: ComboboxOption) => React.ReactNode;
  onCreateOption?: (label: string) => Promise<ComboboxOption | void>;
}

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
      // onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
      //   if (event.key === "Enter") {
      //     onCreate();
      //   }
      // }}
      className={cn(
        "hover:bg-accent hover:text-accent-foreground relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      )}
    >
      <Plus className="mr-2 h-4 w-4" />
      &quot;{query}&quot;
    </div>
  );
}

export function Combobox({
  size = "default",
  variant = "outline",
  options,
  value,
  icon,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  className,
  renderValue,
  renderOption,
  onCreateOption,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selectedOption = options.find((option) => option.value === value);

  const canCreate = React.useMemo(() => {
    if (!query.trim() || !onCreateOption) return false;
    return !options.some(
      (o) => o.label.toLowerCase() === query.trim().toLowerCase(),
    );
  }, [query, options, onCreateOption]);

  const handleCreate = React.useCallback(async () => {
    if (!onCreateOption || !query.trim()) return;

    const newOption = await onCreateOption(query.trim());
    if (newOption) {
      onChange(newOption.value);
    }
    setOpen(false);
  }, [onCreateOption, query, onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between gap-2", className)}
        >
          {icon}
          {value
            ? renderValue
              ? renderValue(selectedOption)
              : selectedOption?.label
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-50 max-h-[300px] min-w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
        side="bottom"
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
            // onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            //   if (event.key === "Enter" && canCreate) {
            //     event.preventDefault();
            //     handleCreate();
            //   }
            // }}
          />
          <CommandList>
            <CommandEmpty>
              {query ? (
                <CommandAddItem query={query} onCreate={handleCreate} />
              ) : (
                "No option found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={option.keywords}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {renderOption ? renderOption(option) : option.label}
                </CommandItem>
              ))}
              {query && canCreate && (
                <CommandAddItem query={query} onCreate={handleCreate} />
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
