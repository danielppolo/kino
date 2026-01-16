"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

import { useTransactionForm } from "@/contexts/transaction-form-context";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";

const shortcutMap: Record<string, "transfer" | "income" | "expense"> = {
  e: "expense",
  i: "income",
  t: "transfer",
};

export default function TransactionShortcuts() {
  const { walletId } = useParams<{ walletId: string }>();
  const { open: formOpen, openForm } = useTransactionForm();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!walletId) return;
      if (!canUseGlobalShortcuts({ formOpen })) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();
      const type = shortcutMap[key];
      if (!type) return;

      event.preventDefault();
      openForm({ type, walletId });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formOpen, openForm, walletId]);

  return null;
}
