"use client";

import React from "react";
import { MoreHorizontal, FileText } from "lucide-react";
import Link from "next/link";

import { Text } from "../ui/typography";
import UNAMDonation from "../UNAMDonation";
import Color from "./color";
import SelectableRow from "./selectable-row";
import ToggleWalletVisibility from "./toggle-wallet-visibility";
import WalletMemberAvatars from "./wallet-member-avatars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import { Wallet } from "@/utils/supabase/types";

interface WalletRowProps {
  wallet: Wallet;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (event: React.MouseEvent<HTMLDivElement>) => void;
  active?: boolean;
}

export function WalletRow({
  wallet,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  active = false,
}: WalletRowProps) {
  return (
    <SelectableRow
      id={wallet.id}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      active={active}
    >
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2">
          {wallet.color && <Color color={wallet.color} size="sm" />}
          <Text className="truncate">{wallet.name}</Text>
        </div>
        <div className="flex items-center gap-2">
          {wallet.id === "c357aa5c-ad41-4c41-8d67-bf5516117187" && (
            <UNAMDonation walletId={wallet.id} />
          )}
          <WalletMemberAvatars
            walletId={wallet.id}
            walletName={wallet.name}
            size="sm"
            clickable={false}
          />
          <ToggleWalletVisibility wallet={wallet} />
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <button className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/app/wallets/${wallet.id}/statement`} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  View Statement
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
