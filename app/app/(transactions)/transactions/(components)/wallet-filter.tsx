"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { Menu, MenuItem } from "@/components/ui/menu";
import { useWallets } from "@/contexts/settings-context";

export default function WalletFilter() {
  const searchParams = useSearchParams();
  const [wallets] = useWallets();
  const { walletId } = useParams<{ walletId?: string }>();

  return (
    <Menu title="Wallets">
      {wallets?.map((wallet) => (
        <Link
          key={wallet.id}
          href={`/app/transactions/${wallet.id}?${searchParams.toString()}`}
        >
          <MenuItem active={walletId === wallet.id} label={wallet.name} />
        </Link>
      ))}
    </Menu>
  );
}
