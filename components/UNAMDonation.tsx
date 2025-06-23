"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "./ui/badge";

import { formatCents } from "@/utils/format-cents";
import { createClient } from "@/utils/supabase/client";
import { getTotalExpenses } from "@/utils/supabase/queries";

export default function UNAMDonation() {
  const walletId = "c357aa5c-ad41-4c41-8d67-bf5516117187";

  const {
    data: totalExpenses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["total-expenses", walletId],
    queryFn: async () => {
      const supabase = createClient();
      const result = await getTotalExpenses(supabase, walletId);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });

  // Calculate 1% of total expenses
  const donationAmount = totalExpenses ? Math.round(totalExpenses * 0.01) : 0;

  if (isLoading || error) {
    return null;
  }

  return (
    <Badge
      variant="secondary"
      className="gap-2 bg-blue-500 text-white dark:bg-blue-600"
    >
      Donated {formatCents(donationAmount, "USD")}
    </Badge>
  );
}
