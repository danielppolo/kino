"use client";

import { Plus } from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CommandShortcut } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTransactionForm } from "@/contexts/transaction-form-context";

export function AddTransactionDropdown() {
  const { walletId } = useParams<{ walletId: string }>();
  const { openForm } = useTransactionForm();

  if (!walletId) return null;

  return (
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
            onClick={() => openForm({ type: "expense", walletId })}
          >
            Expense
            <CommandShortcut>E</CommandShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="justify-between"
            onClick={() => openForm({ type: "income", walletId })}
          >
            Income
            <CommandShortcut>I</CommandShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="justify-between"
            onClick={() => openForm({ type: "transfer", walletId })}
          >
            Transfer
            <CommandShortcut>T</CommandShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
