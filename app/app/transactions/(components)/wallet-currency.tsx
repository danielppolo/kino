"use client";

import React from "react";
import { useParams } from "next/navigation";

import { useWallets } from "@/contexts/settings-context";

const WalletCurrency: React.FC = () => {
  const { walletId } = useParams<{ walletId?: string }>();
  const [, walletsDict] = useWallets();
  const wallet = walletId ? walletsDict.get(walletId) : null;

  if (!wallet) return null;

  return <span className="text-muted-foreground">{wallet.currency}</span>;
};

export default WalletCurrency;
