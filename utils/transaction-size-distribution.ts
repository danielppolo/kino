import {
  convertCurrency,
  CurrencyConversion,
} from "@/utils/currency-conversion";

type WalletCurrency = {
  currency: string;
};

type TransactionSizeRow = {
  amount_cents: number | null;
  wallet_id: string | null;
};

export type TransactionSizeDistributionItem = {
  range: string;
  count: number;
  total_amount_cents: number;
};

const SIZE_BUCKETS = [
  { range: "$0-$10", minCents: 0, maxCents: 1_000 },
  { range: "$10-$50", minCents: 1_000, maxCents: 5_000 },
  { range: "$50-$100", minCents: 5_000, maxCents: 10_000 },
  { range: "$100-$500", minCents: 10_000, maxCents: 50_000 },
  { range: "$500-$1000", minCents: 50_000, maxCents: 100_000 },
  { range: "$1000+", minCents: 100_000, maxCents: Infinity },
] as const;

function getBucket(amountCents: number) {
  return SIZE_BUCKETS.find(
    (bucket) => amountCents >= bucket.minCents && amountCents < bucket.maxCents,
  );
}

export function buildTransactionSizeDistributionData({
  rows,
  walletMap,
  conversionRates,
  baseCurrency,
}: {
  rows: TransactionSizeRow[];
  walletMap: Map<string, WalletCurrency>;
  conversionRates: Record<string, { rate: number } | CurrencyConversion>;
  baseCurrency: string;
}): TransactionSizeDistributionItem[] {
  const buckets = new Map(
    SIZE_BUCKETS.map((bucket) => [
      bucket.range,
      {
        range: bucket.range,
        count: 0,
        total_amount_cents: 0,
      },
    ]),
  );

  rows.forEach((row) => {
    if (!row.wallet_id) return;

    const wallet = walletMap.get(row.wallet_id);
    if (!wallet) return;

    const amountCents = Math.abs(row.amount_cents ?? 0);
    const convertedAmountCents = convertCurrency(
      amountCents,
      wallet.currency,
      baseCurrency,
      conversionRates,
    );
    const bucket = getBucket(convertedAmountCents);
    if (!bucket) return;

    const value = buckets.get(bucket.range);
    if (!value) return;

    value.count += 1;
    value.total_amount_cents += convertedAmountCents;
  });

  return Array.from(buckets.values()).filter((bucket) => bucket.count > 0);
}
