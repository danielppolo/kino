"use client";

import React from "react";
import { useParams } from "next/navigation";

import { Text } from "@/components/ui/typography";
import { useWallets } from "@/contexts/settings-context";

const WalletCurrency: React.FC = () => {
  const { walletId } = useParams<{ walletId?: string }>();
  const [, walletsDict] = useWallets();
  const wallet = walletId ? walletsDict.get(walletId) : null;

  if (!wallet) return null;

  return (
    <Text muted as="span" className="mb-2">
      {wallet.currency}
    </Text>
  );
};

export default WalletCurrency;
