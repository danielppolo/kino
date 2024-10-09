import React from "react";

import CategoryFilter from "@/components/shared/category-filter";
import LabelFilter from "@/components/shared/label-filter";
import WalletFilter from "@/components/shared/wallet-filter";
import {
  listCategories,
  listLabels,
  listWallets,
} from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = async ({ children }) => {
  const supabase = createClient();
  const { data: labels, error: labelsError } = await listLabels(supabase);
  const { data: categories, error: categoriesError } =
    await listCategories(supabase);
  const { data: wallets, error: walletsError } = await listWallets(supabase);

  if (labelsError || categoriesError || walletsError) {
    throw labelsError || categoriesError || walletsError;
  }

  return (
    <div className="flex divide-x w-full">
      {/*  border-b border-b-foreground/10 */}
      <div className="divide-y w-96 shrink-0">
        {/* <TransactionsAreaChart /> */}
      </div>
      <div className="grow divide-y">
        <div className="h-12 px-2">
          <WalletFilter options={wallets} />
        </div>
        <div className="h-10 px-2 flex items-center">
          {/* <DateRangeFilter /> */}

          <div className="w-[50px]">
            <LabelFilter options={labels} />
          </div>
          <CategoryFilter options={categories} />
        </div>
        {children}
      </div>
    </div>
  );
};

export default Layout;
