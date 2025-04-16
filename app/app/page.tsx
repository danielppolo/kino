"use client";

import Wallet from "@/components/shared/wallet";
import { Subtitle, Title } from "@/components/ui/typography";
import { useWallets } from "@/contexts/settings-context";

export default function WalletsPage() {
  const [wallets] = useWallets();
  return (
    <div className="container mx-auto p-4">
      <Title>Wallets</Title>
      <Subtitle>Your Wallets</Subtitle>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {wallets.map((wallet) => (
          <Wallet
            key={wallet.name}
            {...wallet}
            color={`hsl(${Math.floor(Math.random() * 360)} 70% 50%)`}
            amount={100}
          />
        ))}
      </div>
    </div>
  );
}
