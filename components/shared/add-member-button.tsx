"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

import { DrawerDialog } from "../ui/drawer-dialog";
import InviteMemberForm from "./invite-member-form";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWallets } from "@/contexts/settings-context";

const AddMemberButton = () => {
  const [open, setOpen] = useState(false);
  const [wallets] = useWallets();
  const [selectedWalletId, setSelectedWalletId] = useState<string>(
    wallets[0]?.id || "",
  );

  if (wallets.length === 0) {
    return null;
  }

  return (
    <DrawerDialog
      open={open}
      onOpenChange={setOpen}
      title="Invite Member"
      description="Invite a new member to access a wallet."
      trigger={
        <Button size="sm" variant="ghost">
          <Plus className="size-4" />
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Wallet</label>
          <Select
            value={selectedWalletId}
            onValueChange={setSelectedWalletId}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {wallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <InviteMemberForm
          walletId={selectedWalletId}
          onSuccess={() => setOpen(false)}
        />
      </div>
    </DrawerDialog>
  );
};

export default AddMemberButton;
