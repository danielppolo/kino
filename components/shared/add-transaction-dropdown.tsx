"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";

import TransactionForm from "./transaction-form";

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
  const [transactionType, setTransactionType] = useState<
    "income" | "expense" | "transfer"
  >("expense");
  const { walletId } = useParams<{ walletId: string }>();

  const handleTransactionSelect = useCallback(
    (type: "income" | "expense" | "transfer") => {
      if (type === "transfer") {
        setTransactionType("transfer");
      } else {
        setTransactionType(type);
      }
      setOpen(true);
    },
    [],
  );

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

      <TransactionForm
        open={open}
        setOpen={setOpen}
        type={transactionType}
        walletId={walletId}
        onSuccess={() => setOpen(false)}
        enableListeners
      />
    </>
  );
}
