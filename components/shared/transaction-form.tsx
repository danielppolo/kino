import { useEffect, useState } from "react";

import ExpenseIncomeForm from "./expense-income-form";
import TransferForm from "./transfer-form";

import { Transaction } from "@/utils/supabase/types";

function TransactionForm({
  type,
  open,
  initialData,
  walletId,
  enableListeners,
  setOpen,
  onSuccess,
}: {
  type?: "transfer" | "income" | "expense";
  open: boolean;
  initialData?: Transaction;
  walletId?: string;
  enableListeners?: boolean;
  setOpen: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [keyboardType, setKeyboardType] = useState<
    "transfer" | "income" | "expense" | undefined
  >(type);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!enableListeners) return;
      if (e.key) {
        switch (e.key.toLowerCase()) {
          case "t":
            e.preventDefault();
            setOpen?.(true);
            setKeyboardType("transfer");
            break;
          case "e":
            e.preventDefault();
            setOpen?.(true);
            setKeyboardType("expense");
            break;
          case "i":
            e.preventDefault();
            setOpen?.(true);
            setKeyboardType("income");
            break;
        }
      }
    };

    if (!open) {
      document.addEventListener("keydown", down);
    }
    return () => document.removeEventListener("keydown", down);
  }, [setOpen, open, enableListeners]);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setKeyboardType(undefined);
    }
    setOpen?.(v);
  };

  if (!walletId) return null;

  const calcType = keyboardType ?? type;

  return (
    <>
      <TransferForm
        open={open && calcType === "transfer"}
        onOpenChange={handleOpenChange}
        type="transfer"
        walletId={walletId}
        onSuccess={onSuccess}
        initialData={initialData}
      />
      <ExpenseIncomeForm
        open={open && (calcType === "income" || calcType === "expense")}
        onOpenChange={handleOpenChange}
        type={calcType}
        walletId={walletId}
        onSuccess={onSuccess}
        initialData={initialData}
      />
    </>
  );
}

export default TransactionForm;
