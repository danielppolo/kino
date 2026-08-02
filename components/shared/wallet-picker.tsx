"use client";

import React from "react";

import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { useWallets } from "@/contexts/settings-context";
import { Wallet } from "@/utils/supabase/types";

const formatWalletLabel = (wallet: Wallet, showCurrency: boolean) =>
  showCurrency && wallet.currency
    ? `${wallet.name} ${wallet.currency}`
    : wallet.name;

interface WalletPickerProps {
  value?: string;
  currency?: string;
  showCurrency?: boolean;
  exclude?: string;
  walletType?: Wallet["wallet_type"];
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
  showCurrency = true,
  exclude,
  walletType,
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
      if (walletType && wallet.wallet_type !== walletType) return false;
      return !currency || wallet.currency === currency;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const options: ComboboxOption[] = filteredWallets.map((wallet) => ({
    value: wallet.id,
    label: formatWalletLabel(wallet, showCurrency),
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
            <span className="flex items-center gap-3">
              <span>{wallet.name}</span>
              {showCurrency && wallet.currency ? (
                <span className="text-muted-foreground text-xs">
                  {wallet.currency}
                </span>
              ) : null}
            </span>
          );
        }
        return placeholder;
      }}
      renderOption={(option) => {
        const wallet = walletMapMemo.get(option.value);
        if (wallet) {
          return (
            <span className="flex items-center gap-3">
              <span>{wallet.name}</span>
              {showCurrency && wallet.currency ? (
                <span className="text-muted-foreground text-xs">
                  {wallet.currency}
                </span>
              ) : null}
            </span>
          );
        }
        return option.label;
      }}
    />
  );
};

export default WalletPicker;
