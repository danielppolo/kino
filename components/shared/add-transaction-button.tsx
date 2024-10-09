"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

import { DrawerDialog } from "../ui/drawer-dialog";
import TransactionForm from "./transaction-form";

import { Button } from "@/components/ui/button";

const AddTransactionButton = () => {
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
    <TransactionForm onSuccess={() => setOpen(false)} />
  </DrawerDialog>;
};

export default AddTransactionButton;
