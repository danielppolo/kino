"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";

import CsvTransactionUploader from "@/app/app/settings/wallets/[walletId]/(components)/import-transactions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { TooltipButton } from "@/components/ui/tooltip-button";
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
          <TooltipButton variant="ghost" size="sm" tooltip="Add transaction">
            <Plus className="h-4 w-4" />
          </TooltipButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="justify-between"
              onClick={() => openForm({ type: "expense", walletId })}
            >
              Expense
              <Kbd>E</Kbd>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="justify-between"
              onClick={() => openForm({ type: "income", walletId })}
            >
              Income
              <Kbd>I</Kbd>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="justify-between"
              onClick={() => openForm({ type: "transfer", walletId })}
            >
              Transfer
              <Kbd>T</Kbd>
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
