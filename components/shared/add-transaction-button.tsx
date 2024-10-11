"use client";

import React, { useState } from "react";
import { ArrowLeftRight, Minus, Plus } from "lucide-react";
import { useParams } from "next/navigation";

import { DrawerDialog } from "../ui/drawer-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import TransactionForm from "./transaction-form";
import TransferForm from "./transfer-form";

import { Button } from "@/components/ui/button";

interface AddTransactionButtonProps {
  type: "income" | "expense" | "transfer";
}

const AddTransactionButton = (props: AddTransactionButtonProps) => {
  const [open, setOpen] = useState(false);
  const { walletId } = useParams<{ walletId: string }>();

  if (!walletId) return null;

  const icon = {
    income: <Plus className="size-4" />,
    expense: <Minus className="size-4" />,
    transfer: <ArrowLeftRight className="size-4" />,
  };

  return (
    <DrawerDialog
      open={open}
      onOpenChange={setOpen}
      title="Add Transaction"
      description="Add a new transaction to your account."
      trigger={
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger>
              <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
                {icon[props.type]}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>{props.type}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      }
    >
      {props.type === "transfer" ? (
        <TransferForm
          {...props}
          walletId={walletId}
          onSuccess={() => setOpen(false)}
        />
      ) : (
        <TransactionForm
          {...props}
          walletId={walletId}
          onSuccess={() => setOpen(false)}
        />
      )}
    </DrawerDialog>
  );
};

export default AddTransactionButton;
