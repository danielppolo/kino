"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { Button } from "../ui/button";
import AddWalletButton from "./add-wallet-button";
import Wallet from "./wallet";

import { useWallets } from "@/contexts/settings-context";

const WalletFilter = () => {
  const searchParams = useSearchParams();
  const wallets = useWallets();
  const { walletId } = useParams<{ walletId?: string }>();
  return (
    <div className="overflow-x-auto no-scrollbar flex items-center gap-2 justify-start flex-nowrap h-full">
      {wallets?.map((wallet) => (
        <Link
          key={wallet.id}
          href={`/transactions/${wallet.id}?${searchParams.toString()}`}
          passHref
        >
          <Button
            key={wallet.id}
            value={wallet.id}
            size="sm"
            variant={walletId === wallet.id ? "outline" : "ghost"}
          >
            <Wallet name={wallet.name} />
          </Button>
        </Link>
      ))}
      <AddWalletButton />
    </div>
  );
};

export default WalletFilter;
