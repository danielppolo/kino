"use client";

import Link from "next/link";

import AddWalletButton from "@/components/shared/add-wallet-button";
import { Menu, MenuItem } from "@/components/ui/menu";
import { useWallets } from "@/contexts/settings-context";

export default function WalletSection() {
  const [wallets] = useWallets();

  return (
    <Menu title="Wallets">
      {wallets?.map((wallet) => (
        <Link key={wallet.id} href={`/app/settings/wallets/${wallet.id}`}>
          <MenuItem label={wallet.name} active={false} />
        </Link>
      ))}
      <AddWalletButton />
    </Menu>
  );
}
