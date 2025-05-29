"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import AddWalletButton from "@/components/shared/add-wallet-button";
import { MenuItem } from "@/components/ui/menu";
import { useWallets } from "@/contexts/settings-context";

export default function WalletList() {
  const [wallets] = useWallets();
  const { walletId } = useParams<{ walletId: string }>();

  // Sort wallets alphabetically by name
  const sortedWallets = wallets.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      {sortedWallets?.map((wallet) => (
        <Link key={wallet.id} href={`/app/settings/wallets/${wallet.id}`}>
          <MenuItem active={walletId === wallet.id}>{wallet.name}</MenuItem>
        </Link>
      ))}
      <AddWalletButton />
    </div>
  );
}
