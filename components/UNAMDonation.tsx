"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "./ui/badge";
import { Money } from "./ui/money";
import { Text } from "./ui/typography";

import { createClient } from "@/utils/supabase/client";
import { getTotalExpenses } from "@/utils/supabase/queries";

export default function UNAMDonation({ walletId }: { walletId: string }) {
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
    <Badge variant="secondary" className="h-6 gap-1 text-white">
      <Text className="!text-[12px]">Donated</Text>
      <Money
        small
        cents={donationAmount}
        currency="USD"
        className="!text-[12px]"
      />
    </Badge>
  );
}
