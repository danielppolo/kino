"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

import { DrawerDialog } from "../ui/drawer-dialog";
import TransactionForm from "./transaction-form";

import { Button } from "@/components/ui/button";
import { Category, Label, Wallet } from "@/utils/supabase/types";

interface AddTransactionButtonProps {
  wallets: Wallet[];
  labels: Label[];
  categories: Category[];
  type: "income" | "expense" | "transfer";
  onSuccess: () => void;
}

const AddTransactionButton = (props: AddTransactionButtonProps) => {
  const [open, setOpen] = useState(false);

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
  </DrawerDialog>;
};

export default AddTransactionButton;
