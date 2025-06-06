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
  renderValue?: (option: ComboboxOption | undefined) => React.ReactNode;
  renderOption?: (option: ComboboxOption) => React.ReactNode;
  onCreateOption?: (label: string) => Promise<ComboboxOption | void>;
}

export function Combobox({
  size = "default",
  variant = "outline",
  options,
  value,
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          {value
            ? renderValue
              ? renderValue(selectedOption)
              : selectedOption?.label
            : placeholder}
          {/* <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /> */}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {onCreateOption &&
                query.trim() &&
                !options.some(
                  (o) => o.label.toLowerCase() === query.trim().toLowerCase(),
                ) && (
                  <CommandItem
                    value="__create"
                    className="cursor-pointer text-primary"
                    onSelect={async () => {
                      const newOption = await onCreateOption(query.trim());
                      if (newOption) {
                        onChange(newOption.value);
                      }
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create "{query.trim()}"
                  </CommandItem>
                )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={option.keywords}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
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
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
