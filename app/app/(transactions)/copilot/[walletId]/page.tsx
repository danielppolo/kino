import PageHeader from "@/components/shared/page-header";
import { FinanceCopilotCard } from "@/components/shared/finance-copilot-card";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/typography";
import { Filters } from "@/utils/supabase/queries";

interface PageParams {
  params: Promise<{ walletId: string }>;
  searchParams: Promise<Filters>;
}

export const dynamic = "force-dynamic";

export default async function WalletCopilotPage({
  params,
  searchParams,
}: PageParams) {
  const { walletId } = await params;
  const filters = await searchParams;

  return (
    <div className="flex flex-1 min-h-0 flex-col h-full grow">
      <FinanceCopilotCard
        walletId={walletId}
        from={filters.from}
        to={filters.to}
        scopeLabel="this wallet"
      />
    </div>
  );
}
