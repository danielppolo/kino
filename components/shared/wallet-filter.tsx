"use client";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import Wallet from "./wallet";

import { useFilter } from "@/app/protected/filter-context";
import { createClient } from "@/utils/supabase/client";
import { listWallets } from "@/utils/supabase/queries";
import { Category as CategoryType } from "@/utils/supabase/types";

interface WalletFilterProps {
  options?: CategoryType[];
}

const supabase = createClient();

const WalletFilter = (props: WalletFilterProps) => {
  const { data: wallets } = useQuery(listWallets(supabase));
  const {
    filters: { wallet_id },
    setWalletId,
  } = useFilter();

  return (
    <ToggleGroup
      type="single"
      value={wallet_id}
      onValueChange={setWalletId}
      className="overflow-x-auto no-scrollbar flex items-center justify-start flex-nowrap h-full"
    >
      {wallets?.map((wallet) => (
        <ToggleGroupItem
          key={wallet.id}
          value={wallet.id}
          size="sm"
          variant={wallet_id === wallet.id ? "outline" : "default"}
        >
          <Wallet name={wallet.name} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};

export default WalletFilter;
