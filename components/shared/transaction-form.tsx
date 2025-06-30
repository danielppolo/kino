"use client";

import { useEffect, useState } from "react";

import ExpenseIncomeForm from "./expense-income-form";
import TransferForm from "./transfer-form";

import { useTransactionForm } from "@/contexts/transaction-form-context";

function TransactionForm() {
  const { open, type, walletId, initialData, setOpen } = useTransactionForm();

  const [keyboardType, setKeyboardType] = useState<
    "transfer" | "income" | "expense" | undefined
  >(type);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key) {
        switch (e.key.toLowerCase()) {
          case "t":
            e.preventDefault();
            setOpen(true);
            setKeyboardType("transfer");
            break;
          case "e":
            e.preventDefault();
            setOpen(true);
            setKeyboardType("expense");
            break;
          case "i":
            e.preventDefault();
            setOpen(true);
            setKeyboardType("income");
            break;
        }
      }
    };

    if (!open) {
      // document.addEventListener("keydown", down);
    }
    return () => document.removeEventListener("keydown", down);
  }, [setOpen, open]);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setKeyboardType(undefined);
    }
    setOpen(v);
  };

  if (!walletId) return null;

  const formType = keyboardType ?? type ?? "expense";

  return (
    <>
      <TransferForm
        open={open && formType === "transfer"}
        onOpenChange={handleOpenChange}
        type="transfer"
        walletId={walletId}
        initialData={initialData}
        onSuccess={() => {
          setKeyboardType(undefined);
          setOpen(false);
        }}
      />
      <ExpenseIncomeForm
        open={open && (formType === "income" || formType === "expense")}
        onOpenChange={handleOpenChange}
        type={formType}
        walletId={walletId}
        initialData={initialData}
        onSuccess={() => {
          setKeyboardType(undefined);
          setOpen(false);
        }}
      />
    </>
  );
}

export default TransactionForm;
