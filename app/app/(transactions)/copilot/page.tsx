import PageHeader from "@/components/shared/page-header";
import { FinanceCopilotCard } from "@/components/shared/finance-copilot-card";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/typography";
import { Filters } from "@/utils/supabase/queries";

interface PageParams {
  searchParams: Promise<Filters>;
}

export const dynamic = "force-dynamic";

export default async function CopilotPage({ searchParams }: PageParams) {
  const filters = await searchParams;

  return (
    <div className="flex flex-1 min-h-0 h-full flex-col grow">
      <FinanceCopilotCard
        from={filters.from}
        to={filters.to}
        scopeLabel="the active workspace"
      />
    </div>
  );
}
