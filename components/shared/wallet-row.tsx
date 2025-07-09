"use client";

import React from "react";

import { Text } from "../ui/typography";
import UNAMDonation from "../UNAMDonation";
import SelectableRow from "./selectable-row";
import ToggleWalletVisibility from "./toggle-wallet-visibility";

import { Wallet } from "@/utils/supabase/types";

interface WalletRowProps {
  wallet: Wallet;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function WalletRow({
  wallet,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
}: WalletRowProps) {
  return (
    <SelectableRow
      id={wallet.id}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
    >
      <div className="flex flex-1 items-center justify-between">
        <Text className="truncate">{wallet.name}</Text>
        <div className="flex items-center gap-2">
          {wallet.id === "c357aa5c-ad41-4c41-8d67-bf5516117187" && (
            <UNAMDonation walletId={wallet.id} />
          )}
          <ToggleWalletVisibility wallet={wallet} />
        </div>
      </div>
    </SelectableRow>
  );
}

export function WalletRowLoading() {
  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <div className="bg-muted h-4 w-4 animate-pulse rounded-full" />
      <div className="bg-muted h-4 w-32 animate-pulse rounded" />
      <div className="bg-muted h-4 w-16 animate-pulse rounded" />
    </div>
  );
}

export default WalletRow;
