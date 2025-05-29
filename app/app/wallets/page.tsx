"use client";

import Link from "next/link";

import Container from "@/components/shared/container";
import TopBar from "@/components/shared/top-bar";
import Wallet from "@/components/shared/wallet";
import { Subtitle, Title } from "@/components/ui/typography";
import { useWallets } from "@/contexts/settings-context";

export default function WalletsPage() {
  const [wallets] = useWallets();
  const sortedWallets = wallets.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Container>
      <TopBar>
        <Title>Wallets</Title>
      </TopBar>
      <Subtitle>Your Wallets</Subtitle>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {sortedWallets.map((wallet) => (
          <Link href={`/app/transactions/${wallet.id}`} key={wallet.id}>
            <Wallet key={wallet.name} {...wallet} />
          </Link>
        ))}
      </div>
    </Container>
  );
}
