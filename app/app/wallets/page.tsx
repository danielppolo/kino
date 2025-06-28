"use client";

import Link from "next/link";

import Container from "@/components/shared/container";
import TopBar from "@/components/shared/top-bar";
import Wallet from "@/components/shared/wallet";
import { Subtitle, Title } from "@/components/ui/typography";
import { useWallets } from "@/contexts/settings-context";
import { formatCents } from "@/utils/format-cents";

// Force dynamic rendering since this page uses user-specific data
export const dynamic = "force-dynamic";

export default function WalletsPage() {
  const [wallets] = useWallets();
  const sortedWallets = wallets
    .filter((w) => w.visible)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Group wallets by currency
  const walletsByCurrency = sortedWallets.reduce(
    (acc, wallet) => {
      if (!acc[wallet.currency]) acc[wallet.currency] = [];
      acc[wallet.currency].push(wallet);
      return acc;
    },
    {} as Record<string, typeof wallets>,
  );

  return (
    <Container>
      <TopBar>
        <Title>Wallets</Title>
      </TopBar>
      {Object.entries(walletsByCurrency).map(([currency, wallets]) => {
        const totalCents = wallets.reduce(
          (sum, w) => sum + (w.balance_cents ?? 0),
          0,
        );
        return (
          <div key={currency} className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <Subtitle>{currency}</Subtitle>
              <Subtitle className="text-right">
                {formatCents(totalCents, currency)}
              </Subtitle>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {wallets.map((wallet) => (
                <Link href={`/app/transactions/${wallet.id}`} key={wallet.id}>
                  <Wallet key={wallet.name} {...wallet} />
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </Container>
  );
}
