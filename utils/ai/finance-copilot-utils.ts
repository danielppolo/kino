import { convertCurrency } from "@/utils/currency-conversion";
import type { Wallet } from "@/utils/supabase/types";

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance));
}

export function sumLast(values: number[], count: number) {
  return values.slice(-count).reduce((sum, value) => sum + value, 0);
}

export function toBaseCents(
  amountCents: number,
  walletId: string,
  walletMap: Map<string, Wallet>,
  baseCurrency: string,
  conversionRates: Record<string, { rate: number }>,
) {
  const wallet = walletMap.get(walletId);
  const currency = wallet?.currency ?? baseCurrency;
  return convertCurrency(amountCents, currency, baseCurrency, conversionRates);
}

export function walletTypeLabel(walletType: Wallet["wallet_type"]) {
  if (walletType === "bank_account") return "Bank accounts";
  if (walletType === "card") return "Cards";
  return "Cash";
}
