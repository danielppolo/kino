"use client";

import React, { forwardRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

import { useWallets } from "@/contexts/settings-context";

interface WalletPickerProps {
  value?: string;
  currency?: string;
  exclude?: string;
  onChange?: (id: string) => void;
}

const WalletPicker = forwardRef<HTMLButtonElement, WalletPickerProps>(
  ({ onChange, value, currency, exclude }, ref) => {
    const [open, setOpen] = useState(false);
    const [wallets, walletMap] = useWallets();
    const filteredWallets = wallets.filter((wallet) => {
      if (exclude && wallet.id === exclude) return false;
      return !currency || wallet.currency === currency;
    });
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value ? walletMap.get(value)?.name : "Select wallet..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search wallet..." />
            <CommandList>
              <CommandEmpty>No wallet found.</CommandEmpty>
              <CommandGroup>
                {filteredWallets?.map((wallet) => (
                  <CommandItem
                    key={wallet.id}
                    value={wallet.id}
                    onSelect={() => {
                      onChange?.(wallet.id === value ? "" : wallet.id);
                      setOpen(false);
                    }}
                  >
                    {wallet.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

WalletPicker.displayName = "WalletPicker";

export default WalletPicker;
