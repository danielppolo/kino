"use client";

import { useState } from "react";
import { CommandList } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const currencies = ["MXN", "USD", "EUR", "GBP"];

interface CurrencyPickerProps {
  value?: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
}

const CurrencyPicker = ({
  value,
  disabled = false,
  className,
  onChange,
}: CurrencyPickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
          disabled={disabled}
        >
          {value || "Select currency..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandEmpty>No currency found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {currencies.map((currency) => (
                <CommandItem
                  key={currency}
                  onSelect={() => {
                    onChange(currency);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === currency ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {currency}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CurrencyPicker;
