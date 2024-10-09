"use client";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";

import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import AddWalletButton from "./add-wallet-button";
import Wallet from "./wallet";

import { useFilter } from "@/contexts/filter-context";
import { createClient } from "@/utils/supabase/client";
import { listWallets } from "@/utils/supabase/queries";
import { Label as LabelType } from "@/utils/supabase/types";

interface WalletFilterProps {
  options?: LabelType[];
}

const supabase = createClient();

const WalletFilter = (props: WalletFilterProps) => {
  const { data: wallets } = useQuery(listWallets(supabase));
  const {
    filters: { wallet_id },
    setWalletId,
  } = useFilter();

  return (
    <div className="overflow-x-auto no-scrollbar flex items-center justify-start flex-nowrap h-full">
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
      <AddWalletButton />
    </div>
  );
};

export default WalletFilter;
