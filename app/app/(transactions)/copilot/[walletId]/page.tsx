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
    <div className="flex h-[calc(100vh-44px)] min-h-0 flex-col">
      <PageHeader className="rounded-none border-b border-border/70 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Text strong className="text-sm">
            Finance Copilot
          </Text>
          <Badge variant="outline">Wallet scope</Badge>
          {filters.from && filters.to ? (
            <Badge variant="secondary">
              {filters.from} to {filters.to}
            </Badge>
          ) : null}
        </div>
      </PageHeader>

      <div className="min-h-0 flex-1">
        <FinanceCopilotCard
          walletId={walletId}
          from={filters.from}
          to={filters.to}
          scopeLabel="this wallet"
        />
      </div>
    </div>
  );
}
