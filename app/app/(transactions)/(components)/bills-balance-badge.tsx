"use client";

import { usePathname, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { useCurrency } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { listBillsWithPayments } from "@/utils/supabase/queries";

export default function BillsBalanceBadge() {
  const pathname = usePathname();
  const params = useParams();
  const { baseCurrency } = useCurrency();
  const walletId = params.walletId as string | undefined;

  // Only show on bills pages
  const isOnBillsPage = pathname.includes("/bills");

  const { data: bills } = useQuery({
    queryKey: ["bills-with-payments", walletId],
    queryFn: async () => {
      const supabase = createClient();
      const result = await listBillsWithPayments(supabase, { walletId });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    enabled: isOnBillsPage,
  });

  if (!isOnBillsPage || !bills) return null;

  // Calculate totals
  const totalBillsCents = bills.reduce((sum, bill) => sum + bill.amount_cents, 0);
  const totalPaidCents = bills.reduce((sum, bill) => sum + bill.paid_amount_cents, 0);
  const remainingBalance = totalBillsCents - totalPaidCents;

  return (
    <Badge variant="outline" className="h-6">
      <Money cents={remainingBalance} currency={baseCurrency} />
    </Badge>
  );
}
