"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";

import TransactionForm from "./transaction-form";
import TransferForm from "./transfer-form";

import { Button } from "@/components/ui/button";
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

  if (!walletId) return null;

  const handleTransactionSelect = (type: "income" | "expense" | "transfer") => {
    if (type === "transfer") {
      setFormType("transfer");
    } else {
      setFormType("transaction");
      setTransactionType(type);
    }
    setOpen(true);
  };

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
              onClick={() => handleTransactionSelect("expense")}
            >
              Expense
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTransactionSelect("income")}>
              Income
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTransactionSelect("transfer")}
            >
              Transfer
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
