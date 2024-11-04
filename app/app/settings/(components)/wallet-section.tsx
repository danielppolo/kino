"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ListItem } from "@/components/ui/list-item";
import { Text } from "@/components/ui/typography";
import { useWallets } from "@/contexts/settings-context";

export default function WalletSection() {
  const [wallets] = useWallets();
  const { walletId } = useParams<{ walletId: string }>();

  return (
    <div>
      {wallets?.map((wallet) => (
        <Link key={wallet.id} href={`/app/settings/wallets/${wallet.id}`}>
          <ListItem active={walletId === wallet.id}>
            <Text>{wallet.name}</Text>
          </ListItem>
        </Link>
      ))}
      {/* <AddWalletButton /> */}
    </div>
  );
}
