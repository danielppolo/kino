"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

import { buildTransactionUrl } from "@/utils/build-transaction-url";

interface TransactionLinkProps {
  walletId?: string;
  labelId?: string;
  from?: string;
  to?: string;
  children: ReactNode;
  className?: string;
  preserveSearchParams?: boolean;
  shortcut?: number;
}

export function TransactionLink({
  walletId,
  labelId,
  from,
  to,
  children,
  className,
  preserveSearchParams = true,
  shortcut,
  ...props
}: TransactionLinkProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const href = buildTransactionUrl({
    walletId,
    labelId,
    from,
    to,
    searchParams: preserveSearchParams ? searchParams : undefined,
    pathname,
  });

  return (
    <Link href={href} className={cn("group/wallet-link", className)} {...props}>
      {children}
    </Link>
  );
}
