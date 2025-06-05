"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";

import TransactionForm from "./transaction-form";
import TransferForm from "./transfer-form";

import { Button } from "@/components/ui/button";
import { CommandShortcut } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AddTransactionDropdown() {
  const [open, setOpen] = useState(false);
  const [formType, setFormType] = useState<"transaction" | "transfer">(
    "transaction",
  );
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "expense",
  );
  const { walletId } = useParams<{ walletId: string }>();

  const handleTransactionSelect = useCallback(
    (type: "income" | "expense" | "transfer") => {
      if (type === "transfer") {
        setFormType("transfer");
      } else {
        setFormType("transaction");
        setTransactionType(type);
      }
      setOpen(true);
    },
    [],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key) {
        switch (e.key.toLowerCase()) {
          case "e":
            e.preventDefault();
            handleTransactionSelect("expense");
            break;
          case "i":
            e.preventDefault();
            handleTransactionSelect("income");
            break;
          case "t":
            e.preventDefault();
            handleTransactionSelect("transfer");
            break;
        }
      }
    };

    if (!open) {
      document.addEventListener("keydown", down);
    }
    return () => document.removeEventListener("keydown", down);
  }, [handleTransactionSelect, open]);

  if (!walletId) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="justify-between"
              onClick={() => handleTransactionSelect("expense")}
            >
              Expense
              <CommandShortcut>E</CommandShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="justify-between"
              onClick={() => handleTransactionSelect("income")}
            >
              Income
              <CommandShortcut>I</CommandShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="justify-between"
              onClick={() => handleTransactionSelect("transfer")}
            >
              Transfer
              <CommandShortcut>T</CommandShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {formType === "transfer" ? (
        <TransferForm
          open={open}
          onOpenChange={setOpen}
          type="transfer"
          walletId={walletId}
          onSuccess={() => setOpen(false)}
        />
      ) : (
        <TransactionForm
          open={open}
          onOpenChange={setOpen}
          type={transactionType}
          walletId={walletId}
          onSuccess={() => setOpen(false)}
        />
      )}
    </>
  );
}
