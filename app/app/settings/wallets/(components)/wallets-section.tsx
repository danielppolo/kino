"use client";

import React, { useState } from "react";

import EmptyState from "@/components/shared/empty-state";
import RowGroupHeader from "@/components/shared/row-group-header";
import WalletForm from "@/components/shared/wallet-form";
import WalletRow from "@/components/shared/wallet-row";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import { useWallets } from "@/contexts/settings-context";
import { useKeyboardListNavigation } from "@/hooks/use-keyboard-list-navigation";
import { Wallet } from "@/utils/supabase/types";

interface WalletsSectionProps {
  selected: string[];
  onToggle: (wallet: Wallet, shiftKey: boolean) => void;
  wallets?: Wallet[];
  selectAll: () => void;
}

export default function WalletsSection({
  selected,
  onToggle,
  wallets: propWallets,
  selectAll,
}: WalletsSectionProps) {
  const [allWallets] = useWallets();
  const [open, setOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

  // Use provided wallets or fall back to all wallets
  const wallets = propWallets || allWallets;

  // Group wallets by currency
  const groups: Record<string, Wallet[]> = {};

  wallets.forEach((wallet) => {
    const currency = wallet.currency || "Unknown";
    if (!groups[currency]) {
      groups[currency] = [];
    }
    groups[currency].push(wallet);
  });

  // Sort wallets within each group by name
  Object.values(groups).forEach((groupWallets) => {
    groupWallets.sort((a, b) => a.name.localeCompare(b.name));
  });

  // Sort groups alphabetically
  const sortedGroups: Record<string, Wallet[]> = {};
  Object.keys(groups)
    .sort((a, b) => a.localeCompare(b))
    .forEach((currency) => {
      sortedGroups[currency] = groups[currency];
    });

  const groupedWallets = sortedGroups;

  const handleRowClick = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setOpen(true);
  };

  const handleFormSuccess = () => {
    setOpen(false);
    setSelectedWallet(null);
  };

  const orderedWallets = Object.values(groupedWallets).flatMap(
    (group) => group,
  );

  const { activeId, setActiveId } = useKeyboardListNavigation({
    items: orderedWallets,
    getItemId: (wallet) => wallet.id,
    onEnter: handleRowClick,
    onSpace: (wallet) => onToggle(wallet, false),
    onSelectAll: selectAll,
  });

  if (wallets.length === 0) {
    return (
      <EmptyState
        title="No wallets found"
        description="Please try again or add a new wallet."
      />
    );
  }

  return (
    <>
      <div className="space-y-1">
        {Object.entries(groupedWallets).map(([currency, groupWallets]) => (
          <div key={currency}>
            <RowGroupHeader title={currency} />
            {groupWallets.map((wallet) => {
              const isSelected = selected.includes(wallet.id);
              return (
                <WalletRow
                  key={wallet.id}
                  wallet={wallet}
                  selected={isSelected}
                  selectionMode={selected.length > 0}
                  onToggleSelect={(e) => onToggle(wallet, e.shiftKey)}
                  onClick={() => {
                    setActiveId(wallet.id);
                    handleRowClick(wallet);
                  }}
                  active={wallet.id === activeId}
                />
              );
            })}
          </div>
        ))}
      </div>

      <DrawerDialog
        open={open}
        onOpenChange={setOpen}
        title="Wallet Settings"
        description="Manage your wallet settings."
      >
        {selectedWallet && (
          <WalletForm wallet={selectedWallet} onSuccess={handleFormSuccess} />
        )}
      </DrawerDialog>
    </>
  );
}
