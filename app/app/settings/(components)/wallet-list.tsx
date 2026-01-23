"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import AddWalletButton from "@/components/shared/add-wallet-button";
import Color from "@/components/shared/color";
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
          <MenuItem active={walletId === wallet.id}>
            <div className="flex items-center gap-2">
              {wallet.color && <Color color={wallet.color} size="sm" />}
              {wallet.name}
            </div>
          </MenuItem>
        </Link>
      ))}
      <AddWalletButton />
    </div>
  );
}
