"use client";

import React, { memo } from "react";
import { Eye, EyeOff } from "lucide-react";

import SelectableRow from "./selectable-row";
import { Badge } from "../ui/badge";
import { Wallet } from "@/utils/supabase/types";
import { Text } from "../ui/typography";
import UNAMDonation from "../UNAMDonation";

interface WalletRowProps {
  wallet: Wallet;
  onClick?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: () => void;
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
          {wallet.visible ? (
            <Eye className="text-muted-foreground size-4" />
          ) : (
            <EyeOff className="text-muted-foreground size-4" />
          )}
        </div>
      </div>
    </SelectableRow>
  );
}

export default memo(
  WalletRow,
  (prevProps, nextProps) =>
    prevProps.wallet.id === nextProps.wallet.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectionMode === nextProps.selectionMode,
);
