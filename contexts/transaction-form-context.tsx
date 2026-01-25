"use client";

import { createContext, useContext, useState } from "react";

import { Transaction } from "@/utils/supabase/types";

interface TransactionFormContextType {
  open: boolean;
  type?: "transfer" | "income" | "expense";
  walletId?: string;
  initialData?: Transaction;
  setOpen: (open: boolean) => void;
  openForm: (params: {
    type?: "transfer" | "income" | "expense";
    walletId?: string;
    initialData?: Transaction;
  }) => void;
}

const TransactionFormContext = createContext<
  TransactionFormContextType | undefined
>(undefined);

export function TransactionFormProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"transfer" | "income" | "expense">();
  const [walletId, setWalletId] = useState<string>();
  const [initialData, setInitialData] = useState<Transaction>();

  const openForm = ({
    type: newType,
    walletId: newWalletId,
    initialData: newInitialData,
  }: {
    type?: "transfer" | "income" | "expense";
    walletId?: string;
    initialData?: Transaction;
  }) => {
    setType(newType);
    setWalletId(newWalletId);
    setInitialData(newInitialData);
    setOpen(true);
  };

  return (
    <TransactionFormContext.Provider
      value={{
        open,
        type,
        walletId,
        initialData,
        setOpen,
        openForm,
      }}
    >
      {children}
    </TransactionFormContext.Provider>
  );
}

export function useTransactionForm() {
  const context = useContext(TransactionFormContext);
  if (context === undefined) {
    throw new Error(
      "useTransactionForm must be used within a TransactionFormProvider",
    );
  }
  return context;
}
