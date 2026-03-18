"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

type StatementType = "all" | "transactions" | "bills";

interface DateRangeFormProps {
  walletId: string;
  from: string;
  to: string;
  statementType: StatementType;
}

export default function DateRangeForm({ walletId, from, to, statementType }: DateRangeFormProps) {
  const router = useRouter();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newFrom = fromRef.current?.value ?? from;
    const newTo = toRef.current?.value ?? to;
    const newType = typeRef.current?.value ?? statementType;
    router.push(
      `/app/wallets/${walletId}/statement?from=${newFrom}&to=${newTo}&type=${newType}`,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 print:hidden">
      <select
        ref={typeRef}
        defaultValue={statementType}
        className="rounded border px-2 py-1 text-sm"
      >
        <option value="all">All</option>
        <option value="transactions">Transactions</option>
        <option value="bills">Bills</option>
      </select>
      <label className="text-xs text-muted-foreground">From</label>
      <input
        ref={fromRef}
        type="date"
        defaultValue={from}
        className="rounded border px-2 py-1 text-sm"
      />
      <label className="text-xs text-muted-foreground">To</label>
      <input
        ref={toRef}
        type="date"
        defaultValue={to}
        className="rounded border px-2 py-1 text-sm"
      />
      <button type="submit" className="rounded border px-3 py-1 text-sm">
        Apply
      </button>
    </form>
  );
}
