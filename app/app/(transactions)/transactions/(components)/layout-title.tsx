"use client";

import React from "react";

import { Title } from "@/components/ui/typography";
import { useWallets } from "@/contexts/settings-context";

export default function LayoutTitle({ walletId }: { walletId: string }) {
  const [, walletMap] = useWallets();

  return <Title>{walletMap.get(walletId as string)?.name}</Title>;
}
