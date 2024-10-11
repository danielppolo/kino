"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

import { DrawerDialog } from "../ui/drawer-dialog";
import TransactionForm from "./transaction-form";

import { Button } from "@/components/ui/button";

interface AddTransactionButtonProps {
  type: "income" | "expense" | "transfer";
  walletId: string;
  date?: string;
}

const AddTransactionButton = (props: AddTransactionButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <DrawerDialog
      open={open}
      onOpenChange={setOpen}
      title="Add Transaction"
      description="Add a new transaction to your account."
      trigger={
        <Button size="sm" variant="ghost">
          <Plus className="size-4" />
        </Button>
      }
    >
      <TransactionForm {...props} onSuccess={() => setOpen(false)} />
    </DrawerDialog>
  );
};

export default AddTransactionButton;
