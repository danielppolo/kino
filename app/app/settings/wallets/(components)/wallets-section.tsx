"use client";

import React, { useState } from "react";
import WalletRow from "@/components/shared/wallet-row";
import { useWallets } from "@/contexts/settings-context";
import { Wallet } from "@/utils/supabase/types";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import WalletForm from "@/components/shared/wallet-form";

interface WalletsSectionProps {
  selected: string[];
  onToggle: (wallet: Wallet) => void;
}

export default function WalletsSection({
  selected,
  onToggle,
}: WalletsSectionProps) {
  const [wallets] = useWallets();
  const [open, setOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

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
