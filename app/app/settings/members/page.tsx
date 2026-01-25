"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import MembersSection from "./(components)/members-section";

import AddMemberButton from "@/components/shared/add-member-button";
import { BulkActions } from "@/components/shared/bulk-actions";
import PageHeader from "@/components/shared/page-header";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useWallets } from "@/contexts/settings-context";
import { useSelection } from "@/hooks/use-selection";
import { canUseGlobalShortcuts } from "@/utils/keyboard-shortcuts";
import { createClient } from "@/utils/supabase/client";
import { getAllWalletMembers } from "@/utils/supabase/queries";
import { removeWalletMember } from "@/utils/supabase/mutations";

type WalletMember = {
  id: string;
  user_id: string;
  wallet_id: string;
  role: "owner" | "editor" | "reader";
  email: string | null;
  created_at: string;
};

export default function MembersPage() {
  const [wallets] = useWallets();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchCurrentUser();
  }, []);

  // Fetch all members for all wallets
  const walletIds = useMemo(() => wallets.map((w) => w.id), [wallets]);

  const { data: allMembersData } = useQuery({
    queryKey: ["wallet-members", walletIds],
    queryFn: async () => {
      const supabase = createClient();
      return getAllWalletMembers(supabase, walletIds);
    },
    enabled: walletIds.length > 0,
  });

  const { allMemberIds, membersMap } = useMemo(() => {
    const ids: string[] = [];
    const map = new Map<string, WalletMember>();

    if (allMembersData?.data) {
      allMembersData.data.forEach((m: any) => {
        const member: WalletMember = {
          id: m.id,
          user_id: m.user_id,
          wallet_id: m.wallet_id,
          role: m.role as "owner" | "editor" | "reader",
          email: m.email,
          created_at: m.created_at,
        };
        ids.push(m.id);
        map.set(m.id, member);
      });
    }

    return { allMemberIds: ids, membersMap: map };
  }, [allMembersData]);

  const {
    selected,
    selectedCount,
    clearSelection,
    toggleSelection,
    selectAll,
  } = useSelection({
    getAllIds: () => allMemberIds,
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Check if trying to remove last owner of any wallet
      const walletOwnerCounts = new Map<string, number>();

      Array.from(membersMap.values()).forEach((member) => {
        if (member.role === "owner") {
          walletOwnerCounts.set(
            member.wallet_id,
            (walletOwnerCounts.get(member.wallet_id) || 0) + 1,
          );
        }
      });

      // Check if any selected members are last owners
      for (const id of ids) {
        const member = membersMap.get(id);
        if (member?.role === "owner") {
          const ownerCount = walletOwnerCounts.get(member.wallet_id) || 0;
          if (ownerCount === 1) {
            throw new Error(
              `Cannot remove the last owner of ${wallets.find((w) => w.id === member.wallet_id)?.name || "wallet"}`,
            );
          }
        }
      }

      // Remove all selected members
      const results = await Promise.all(
        ids.map((id) => removeWalletMember(id)),
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-members"] });
      toast.success(`${selectedCount} member${selectedCount === 1 ? "" : "s"} removed`);
      clearSelection();
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to remove members");
      }
    },
  });

  const toggleSelect = (member: WalletMember, shiftKey = false) => {
    toggleSelection(member.id, shiftKey);
  };

  const handleDelete = async () => {
    if (
      confirm(
        `Are you sure you want to remove ${selectedCount} member${selectedCount === 1 ? "" : "s"}?`,
      )
    ) {
      deleteMutation.mutate(selected);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canUseGlobalShortcuts()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (selectedCount === 0) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (!deleteMutation.isPending) {
          handleDelete();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDelete, selectedCount, deleteMutation.isPending]);

  if (wallets.length === 0) {
    return (
      <>
        <PageHeader className="justify-end">
          <div />
        </PageHeader>
        <div className="flex h-full items-center justify-center">
          <div className="text-muted-foreground text-center">
            <p>No wallets found</p>
            <p className="text-sm">Create a wallet to manage members</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader className="justify-end">
        <AddMemberButton />
      </PageHeader>

      <div style={{ height: "calc(100vh - 44px)", overflow: "auto" }}>
        <MembersSection
          selected={selected}
          onToggle={toggleSelect}
          selectAll={selectAll}
        />
      </div>

      <BulkActions
        selectedCount={selectedCount}
        clearSelection={clearSelection}
        selectAll={selectAll}
      >
        <TooltipButton
          size="sm"
          variant="ghost"
          tooltip="Delete members (Delete)"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          loading={deleteMutation.isPending}
        >
          <Trash2 className="size-4" />
        </TooltipButton>
      </BulkActions>
    </>
  );
}
