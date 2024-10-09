"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

import { DrawerDialog } from "../ui/drawer-dialog";
import WalletForm from "./wallet-form";

import { Button } from "@/components/ui/button";

const AddWalletButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <DrawerDialog
      open={open}
      onOpenChange={setOpen}
      title="Add New Wallet"
      description="Create a new wallet to start tracking your expenses."
      trigger={
        <Button size="sm" variant="ghost">
          <Plus className="size-4" />
        </Button>
      }
    >
      <WalletForm
        onSuccess={() => {
          setOpen(false);
        }}
      />
    </DrawerDialog>
  );
};

export default AddWalletButton;
