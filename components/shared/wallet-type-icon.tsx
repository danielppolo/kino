import { AppleWallet, Coins, CreditCard } from "iconoir-react";

import { Database } from "@/utils/supabase/database.types";

type WalletType = Database["public"]["Enums"]["wallet_type"];

export const DEFAULT_WALLET_TYPE: WalletType = "bank_account";

export const normalizeWalletType = (
  walletType?: string | null,
): WalletType => {
  if (walletType === "card" || walletType === "cash") return walletType;
  if (walletType === "savings") return "bank_account";
  return DEFAULT_WALLET_TYPE;
};

export const getWalletTypeLabel = (walletType?: string | null) => {
  const normalizedType = normalizeWalletType(walletType);

  if (normalizedType === "bank_account") return "Bank account";
  if (normalizedType === "card") return "Card";
  return "Cash";
};

export const WalletTypeIcon = ({
  walletType,
  className,
}: {
  walletType?: string | null;
  className?: string;
}) => {
  const normalizedType = normalizeWalletType(walletType);

  if (normalizedType === "card") return <CreditCard className={className} />;
  if (normalizedType === "cash") return <Coins className={className} />;
  return <AppleWallet className={className} />;
};
