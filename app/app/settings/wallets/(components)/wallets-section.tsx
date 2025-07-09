"use client";

import React, { useState } from "react";

import WalletForm from "@/components/shared/wallet-form";
import WalletRow from "@/components/shared/wallet-row";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import { useWallets } from "@/contexts/settings-context";
import { Wallet } from "@/utils/supabase/types";

interface WalletsSectionProps {
  selected: string[];
  onToggle: (wallet: Wallet) => void;
  wallets?: Wallet[];
}

export default function WalletsSection({
  selected,
  onToggle,
  wallets: propWallets,
}: WalletsSectionProps) {
  const [allWallets] = useWallets();
  const [open, setOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

  // Use provided wallets or fall back to all wallets
  const wallets = propWallets || allWallets;

  const handleRowClick = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setOpen(true);
  };

  const handleFormSuccess = () => {
    setOpen(false);
    setSelectedWallet(null);
  };

  return (
    <>
      <div className="divide-y">
        {wallets.map((wallet) => {
          const isSelected = selected.includes(wallet.id);
          return (
            <WalletRow
              key={wallet.id}
              wallet={wallet}
              selected={isSelected}
              selectionMode={selected.length > 0}
              onToggleSelect={() => onToggle(wallet)}
              onClick={() => handleRowClick(wallet)}
            />
          );
        })}
      </div>

      <DrawerDialog
        open={open}
        onOpenChange={setOpen}
        title="Edit Wallet"
        description="Update your wallet information."
      >
        {selectedWallet && (
          <WalletForm wallet={selectedWallet} onSuccess={handleFormSuccess} />
        )}
      </DrawerDialog>
    </>
  );
}
