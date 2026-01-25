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
import { Wallet } from "@/utils/supabase/types";

interface WalletMultiSelectProps {
  disabled?: boolean;
  value?: string[];
  onChange: (value: string[]) => void;
  options: Wallet[];
  placeholder?: string;
  className?: string;
}

const WalletMultiSelect = React.forwardRef<
  HTMLButtonElement,
  WalletMultiSelectProps
>(
  (
    {
      disabled,
      value = [],
      onChange,
      options,
      placeholder = "Select wallets",
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");

    const toggleOption = (option: string) => {
      if (value.includes(option)) {
        onChange(value.filter((v) => v !== option));
      } else {
        onChange([...value, option]);
      }
    };

    const handleClear = () => onChange([]);

    const q = query.toLowerCase();
    const filteredOptions = options.filter((w) =>
      w.name.toLowerCase().includes(q),
    );

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
                    const wallet = options.find((w) => w.id === val);
                    return (
                      <Badge key={val} className="m-1">
                        {wallet?.name ?? val}
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
              placeholder="Search wallets..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>No wallets found.</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((wallet) => {
                  const selected = value.includes(wallet.id);
                  return (
                    <CommandItem
                      key={wallet.id}
                      value={wallet.name}
                      onSelect={() => toggleOption(wallet.id)}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox checked={selected} />
                      <Text as="span">
                        {wallet.name} ({wallet.currency})
                      </Text>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
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

WalletMultiSelect.displayName = "WalletMultiSelect";
export default WalletMultiSelect;
