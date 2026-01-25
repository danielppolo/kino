"use client";

import { DrawerDialog } from "@/components/ui/drawer-dialog";
import WalletMembersEditSection from "./wallet-members-edit-section";

interface WalletMembersDialogProps {
  walletId: string;
  walletName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WalletMembersDialog({
  walletId,
  walletName,
  open,
  onOpenChange,
}: WalletMembersDialogProps) {
  return (
    <DrawerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${walletName} Members`}
      description="View and manage members with access to this wallet."
    >
      <WalletMembersEditSection walletId={walletId} />
    </DrawerDialog>
  );
}
