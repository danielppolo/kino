"use client";

import { createContext, useContext, useState } from "react";

import { Transaction } from "@/utils/supabase/types";

interface BillPrefill {
  billId: string;
  amount: number; // amount in cents
}

interface TransactionFormContextType {
  open: boolean;
  type?: "transfer" | "income" | "expense";
  walletId?: string;
  initialData?: Transaction;
  billPrefill?: BillPrefill;
  setOpen: (open: boolean) => void;
  openForm: (params: {
    type?: "transfer" | "income" | "expense";
    walletId?: string;
    initialData?: Transaction;
    billPrefill?: BillPrefill;
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
  const [billPrefill, setBillPrefill] = useState<BillPrefill>();

  const openForm = ({
    type: newType,
    walletId: newWalletId,
    initialData: newInitialData,
    billPrefill: newBillPrefill,
  }: {
    type?: "transfer" | "income" | "expense";
    walletId?: string;
    initialData?: Transaction;
    billPrefill?: BillPrefill;
  }) => {
    setType(newType);
    setWalletId(newWalletId);
    setInitialData(newInitialData);
    setBillPrefill(newBillPrefill);
    setOpen(true);
  };

  const handleSetOpen = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Clear billPrefill when closing the form
      setBillPrefill(undefined);
    }
  };

  return (
    <TransactionFormContext.Provider
      value={{
        open,
        type,
        walletId,
        initialData,
        billPrefill,
        setOpen: handleSetOpen,
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
