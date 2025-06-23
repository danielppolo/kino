"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { buildTransactionUrl } from "@/utils/build-transaction-url";

interface TransactionLinkProps {
  walletId?: string;
  labelId?: string;
  from?: string;
  to?: string;
  children: ReactNode;
  className?: string;
  preserveSearchParams?: boolean;
}

export function TransactionLink({
  walletId,
  labelId,
  from,
  to,
  children,
  className,
  preserveSearchParams = true,
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
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
