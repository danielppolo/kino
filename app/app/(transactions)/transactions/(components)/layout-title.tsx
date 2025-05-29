"use client";

import React from "react";

import { Text, Title } from "@/components/ui/typography";
import { useWallets } from "@/contexts/settings-context";
import { formatCents } from "@/utils/format-cents";

export default function LayoutTitle({ walletId }: { walletId: string }) {
  const [, walletMap] = useWallets();
  const wallet = walletMap.get(walletId as string);

  return (
    <div className="flex w-full items-center justify-between">
      <Title>{wallet?.name}</Title>
      {wallet && (
        <Text>{formatCents(wallet.balance_cents ?? 0, wallet.currency)}</Text>
      )}
    </div>
  );
}
