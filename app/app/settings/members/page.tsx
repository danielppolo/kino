"use client";

import { useState } from "react";

import PageHeader from "@/components/shared/page-header";
import WalletMembersSection from "@/components/shared/wallet-members-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWallets } from "@/contexts/settings-context";

export default function MembersPage() {
  const [wallets] = useWallets();
  const [selectedWalletId, setSelectedWalletId] = useState<string>(
    wallets[0]?.id || "",
  );

  if (wallets.length === 0) {
    return (
      <>
        <PageHeader title="Members" />
        <div className="flex h-full items-center justify-center">
          <div className="text-muted-foreground text-center">
            <p>No wallets found</p>
            <p className="text-sm">Create a wallet to manage members</p>
          </div>
        </div>
      </>
    );
  }

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);

  return (
    <>
      <PageHeader title="Members">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Wallet:</span>
          <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {wallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <div
        style={{ height: "calc(100vh - 44px)", overflow: "auto" }}
        className="p-4"
      >
        {selectedWallet && (
          <WalletMembersSection walletId={selectedWallet.id} />
        )}
      </div>
    </>
  );
}
