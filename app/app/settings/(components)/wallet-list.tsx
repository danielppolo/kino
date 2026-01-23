"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import AddWalletButton from "@/components/shared/add-wallet-button";
import Color from "@/components/shared/color";
import WalletMemberAvatars from "@/components/shared/wallet-member-avatars";
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {wallet.color && <Color color={wallet.color} size="sm" />}
                {wallet.name}
              </div>
              <WalletMemberAvatars walletId={wallet.id} size="sm" />
            </div>
          </MenuItem>
        </Link>
      ))}
      <AddWalletButton />
    </div>
  );
}
