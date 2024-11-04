"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import AddWalletButton from "@/components/shared/add-wallet-button";
import { Menu, MenuItem } from "@/components/ui/menu";
import { useWallets } from "@/contexts/settings-context";

export default function WalletSection() {
  const [wallets] = useWallets();
  const { walletId } = useParams<{ walletId: string }>();

  return (
    <Menu title="Wallets">
      {wallets?.map((wallet) => (
        <Link key={wallet.id} href={`/app/settings/wallets/${wallet.id}`}>
          <MenuItem label={wallet.name} active={walletId === wallet.id} />
        </Link>
      ))}
      <AddWalletButton />
    </Menu>
  );
}
