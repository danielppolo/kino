"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { useCurrency, useWallets } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { getTransferFlowData } from "@/utils/supabase/queries";

interface TransferFlowDiagramChartProps {
  walletId?: string;
  from?: string;
  to?: string;
}

export function TransferFlowDiagramChart({
  walletId,
  from,
  to,
}: TransferFlowDiagramChartProps) {
  const {
    data: transferData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transfer-flow-diagram", walletId, from, to],
    queryFn: async () => {
      const supabase = await createClient();
      const { data, error } = await getTransferFlowData(supabase, {
        walletId,
        from,
        to,
      });

      if (error) throw error;
      return data;
    },
  });

  const [wallets, walletMap] = useWallets();
  const { conversionRates, baseCurrency } = useCurrency();

  const maxAmount = React.useMemo(() => {
    if (!transferData || transferData.length === 0) return 1;
    return Math.max(...transferData.map((t) => t.total_amount_cents));
  }, [transferData]);

  const getBarWidth = (amount: number) => {
    const minWidth = 20;
    const maxWidth = 100;
    const ratio = amount / maxAmount;
    return minWidth + (maxWidth - minWidth) * ratio;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transfer Flow Diagram</CardTitle>
          <CardDescription>
            Money movement between wallets in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transfer Flow Diagram</CardTitle>
          <CardDescription>
            Money movement between wallets in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-red-500">
            Error loading chart data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transferData || transferData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transfer Flow Diagram</CardTitle>
          <CardDescription>
            Money movement between wallets in {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-gray-500">
            No transfer data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Flow Diagram</CardTitle>
        <CardDescription>
          Money movement between wallets in {baseCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transferData.map((transfer, index) => {
            const fromWallet = walletMap.get(transfer.from_wallet_id);
            const toWallet = walletMap.get(transfer.to_wallet_id);

            const fromRate = fromWallet ? conversionRates[fromWallet.currency]?.rate ?? 1 : 1;
            const amount = (transfer.total_amount_cents * fromRate) / 100;
            const barWidth = getBarWidth(transfer.total_amount_cents);

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-2">
                    {fromWallet && (
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: fromWallet.color ?? undefined }}
                      />
                    )}
                    <span className="text-sm font-medium truncate">
                      {transfer.from_wallet_name}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 flex items-center gap-2">
                    {toWallet && (
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: toWallet.color ?? undefined }}
                      />
                    )}
                    <span className="text-sm font-medium truncate">
                      {transfer.to_wallet_name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 rounded transition-all"
                    style={{
                      width: `${barWidth}%`,
                      background: `linear-gradient(90deg, ${fromWallet?.color || "hsl(var(--primary))"} 0%, ${toWallet?.color || "hsl(var(--primary))"} 100%)`,
                    }}
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <Money cents={Math.round(amount * 100)} currency={baseCurrency} />
                    <span className="text-muted-foreground">
                      ({transfer.transfer_count} transfer{transfer.transfer_count !== 1 ? "s" : ""})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {transferData.length === 0 && (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No transfers found for this period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
