import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { listWallets } from "@/utils/supabase/queries";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const supabase = await createClient();
  const { data: wallets } = await listWallets(supabase);

  // Redirect to first wallet's bills view if available
  if (wallets && wallets.length > 0) {
    const firstWallet = wallets.sort((a, b) =>
      a.name.localeCompare(b.name),
    )[0];
    redirect(`/app/bills/${firstWallet.id}`);
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-muted-foreground text-center">
        <p>No wallets found.</p>
        <p className="text-sm">Create a wallet first to view bills.</p>
      </div>
    </div>
  );
}

