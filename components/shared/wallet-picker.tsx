"use client";

import React from "react";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useWallets } from "@/contexts/settings-context";
import { Wallet } from "@/utils/supabase/types";

interface WalletPickerProps {
  value?: string;
  currency?: string;
  exclude?: string;
  onChange?: (id: string) => void;
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

const WalletPicker = ({
  onChange,
  value,
  currency,
  exclude,
  size = "default",
  variant = "outline",
  placeholder = "Select wallet...",
  className,
  icon,
}: WalletPickerProps) => {
  const [wallets] = useWallets();

  const filteredWallets = wallets
    .filter((wallet) => {
      if (exclude && wallet.id === exclude) return false;
      return !currency || wallet.currency === currency;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const options: ComboboxOption[] = filteredWallets.map((wallet) => ({
    value: wallet.id,
    label: wallet.name,
    keywords: [wallet.name.toLowerCase(), wallet.currency ?? ""],
  }));

  const walletMapMemo = new Map<string, Wallet>();
  wallets.forEach((w) => walletMapMemo.set(w.id, w));

  return (
    <Combobox
      variant={variant}
      size={size}
      icon={icon}
      options={options}
      value={value ?? ""}
      onChange={onChange ?? (() => {})}
      placeholder={placeholder}
      className={className}
      renderValue={(option) => {
        const wallet = option && walletMapMemo.get(option.value);
        if (wallet) {
          return (
            <span className="flex items-center gap-2">
              <span>{wallet.name}</span>
              {wallet.currency && (
                <span className="text-muted-foreground text-xs">
                  ({wallet.currency})
                </span>
              )}
            </span>
          );
        }
        return placeholder;
      }}
      renderOption={(option) => {
        const wallet = walletMapMemo.get(option.value);
        if (wallet) {
          return (
            <span className="flex items-center gap-2">
              <span>{wallet.name}</span>
              {wallet.currency && (
                <span className="text-muted-foreground text-xs">
                  ({wallet.currency})
                </span>
              )}
            </span>
          );
        }
        return option.label;
      }}
    />
  );
};

export default WalletPicker;
