"use client";

import React from "react";

import { Text, Title } from "@/components/ui/typography";
import { Money } from "@/components/ui/money";
import { useWallets } from "@/contexts/settings-context";

export default function LayoutTitle({ walletId }: { walletId: string }) {
  const [, walletMap] = useWallets();
  const wallet = walletMap.get(walletId as string);

  return (
    <div className="flex w-full items-center justify-between">
      <Title>{wallet?.name}</Title>
      {wallet && (
        <Money cents={wallet.balance_cents ?? 0} currency={wallet.currency} />
      )}
    </div>
  );
}
