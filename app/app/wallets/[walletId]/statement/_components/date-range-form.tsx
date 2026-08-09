"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

type StatementType = "all" | "transactions" | "bills";

interface DateRangeFormProps {
  annualInterest: number;
  walletId: string;
  from: string;
  to: string;
  statementType: StatementType;
}

export default function DateRangeForm({
  annualInterest,
  walletId,
  from,
  to,
  statementType,
}: DateRangeFormProps) {
  const router = useRouter();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const annualInterestRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newFrom = fromRef.current?.value ?? from;
    const newTo = toRef.current?.value ?? to;
    const newType = typeRef.current?.value ?? statementType;
    const newAnnualInterest =
      annualInterestRef.current?.value ?? annualInterest.toString();
    const query = new URLSearchParams({
      annualInterest: newAnnualInterest,
      from: newFrom,
      to: newTo,
      type: newType,
    });
    router.push(`/app/wallets/${walletId}/statement?${query.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 print:hidden"
    >
      <select
        ref={typeRef}
        defaultValue={statementType}
        className="rounded border px-2 py-1 text-sm"
      >
        <option value="all">All</option>
        <option value="transactions">Transactions</option>
        <option value="bills">Bills</option>
      </select>
      <label className="text-muted-foreground text-xs">From</label>
      <input
        ref={fromRef}
        type="date"
        defaultValue={from}
        className="rounded border px-2 py-1 text-sm"
      />
      <label className="text-muted-foreground text-xs">To</label>
      <input
        ref={toRef}
        type="date"
        defaultValue={to}
        className="rounded border px-2 py-1 text-sm"
      />
      <label
        className="text-muted-foreground text-xs"
        htmlFor="annual-interest"
      >
        Annual interest
      </label>
      <div className="bg-background flex items-center rounded border">
        <input
          ref={annualInterestRef}
          id="annual-interest"
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={annualInterest}
          className="w-20 px-2 py-1 text-right text-sm outline-none"
          aria-label="Annual interest percentage"
        />
        <span className="text-muted-foreground pr-2 text-xs">%</span>
      </div>
      <button type="submit" className="rounded border px-3 py-1 text-sm">
        Apply
      </button>
    </form>
  );
}
