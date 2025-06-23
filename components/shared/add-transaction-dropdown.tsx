"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";

import CsvTransactionUploader from "@/app/app/settings/wallets/[walletId]/(components)/import-transactions";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!walletId) return null;

  const handleButtonClick = () => {
    fileInputRef.current?.click();
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

            <DropdownMenuItem
              onClick={handleButtonClick}
              className="justify-between"
            >
              Import
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <CsvTransactionUploader fileInputRef={fileInputRef} />
    </>
  );
}
