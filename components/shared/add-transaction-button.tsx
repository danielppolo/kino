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
import { Transaction } from "@/utils/supabase/types";

interface AddTransactionButtonProps {
  type: "income" | "expense" | "transfer";
  onSuccess?: () => void;
  onOptimisticSuccess?: (placeholderTransaction: Transaction) => void;
}

const AddTransactionButton = (props: AddTransactionButtonProps) => {
  const [open, setOpen] = useState(false);
  const [formType, setFormType] = useState<"transaction" | "transfer">(
    props.type === "transfer" ? "transfer" : "transaction",
  );
  const { walletId } = useParams<{ walletId: string }>();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return; // Don't trigger if typing in an input
      }
      if (e.key === "c" || e.key === "C") {
        setFormType("transaction");
        setOpen(true);
      } else if (e.key === "t" || e.key === "T") {
        setFormType("transfer");
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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
            <TooltipTrigger asChild>
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
      {formType === "transfer" ? (
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
          onOptimisticSuccess={props.onOptimisticSuccess}
        />
      )}
    </DrawerDialog>
  );
};

export default AddTransactionButton;
