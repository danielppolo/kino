"use client";

import { createContext, useContext, useState } from "react";

import { Transaction } from "@/utils/supabase/types";

interface BillPrefill {
  billId: string;
  amount: number; // amount in cents
}

export interface TransferPrefill {
  sourceTransactionId: string;
  senderWalletId: string;
  receiverWalletId: string;
  senderAmount: number;
  date: string;
  description?: string;
}

interface TransactionFormContextType {
  open: boolean;
  type?: "transfer" | "income" | "expense";
  walletId?: string;
  initialData?: Transaction;
  billPrefill?: BillPrefill;
  transferPrefill?: TransferPrefill;
  setOpen: (open: boolean) => void;
  openForm: (params: {
    type?: "transfer" | "income" | "expense";
    walletId?: string;
    initialData?: Transaction;
    billPrefill?: BillPrefill;
    transferPrefill?: TransferPrefill;
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
  const [transferPrefill, setTransferPrefill] = useState<TransferPrefill>();

  const openForm = ({
    type: newType,
    walletId: newWalletId,
    initialData: newInitialData,
    billPrefill: newBillPrefill,
    transferPrefill: newTransferPrefill,
  }: {
    type?: "transfer" | "income" | "expense";
    walletId?: string;
    initialData?: Transaction;
    billPrefill?: BillPrefill;
    transferPrefill?: TransferPrefill;
  }) => {
    setType(newType);
    setWalletId(newWalletId);
    setInitialData(newInitialData);
    setBillPrefill(newBillPrefill);
    setTransferPrefill(newTransferPrefill);
    setOpen(true);
  };

  const handleSetOpen = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setBillPrefill(undefined);
      setTransferPrefill(undefined);
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
        transferPrefill,
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
