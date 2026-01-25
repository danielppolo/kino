"use client";

import React, { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import EmptyState from "@/components/shared/empty-state";
import MemberRow from "@/components/shared/member-row";
import RowGroupHeader from "@/components/shared/row-group-header";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import EditMemberForm from "@/components/shared/edit-member-form";
import { useWallets } from "@/contexts/settings-context";
import { useKeyboardListNavigation } from "@/hooks/use-keyboard-list-navigation";
import { createClient } from "@/utils/supabase/client";
import { getWalletMembers } from "@/utils/supabase/queries";
import { Wallet } from "@/utils/supabase/types";

type WalletMember = {
  id: string;
  user_id: string;
  wallet_id: string;
  role: "owner" | "editor" | "reader";
  email: string | null;
  phone: string | null;
  created_at: string;
};

interface MembersSectionProps {
  selected: string[];
  onToggle: (member: WalletMember, shiftKey: boolean) => void;
  selectAll: () => void;
}

export default function MembersSection({
  selected,
  onToggle,
  selectAll,
}: MembersSectionProps) {
  const [wallets] = useWallets();
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WalletMember | null>(
    null,
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwnerMap, setIsOwnerMap] = useState<Record<string, boolean>>({});

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
  const memberQueries = wallets.map((wallet) => {
    return useQuery({
      queryKey: ["wallet-members", wallet.id],
      queryFn: async () => {
        const supabase = createClient();
        return getWalletMembers(supabase, wallet.id);
      },
    });
  });

  const isLoading = memberQueries.some((q) => q.isLoading);

  // Build members map grouped by wallet
  const membersByWallet: Record<string, WalletMember[]> = {};
  const walletsMap = new Map<string, Wallet>();

  wallets.forEach((wallet) => {
    walletsMap.set(wallet.id, wallet);
  });

  memberQueries.forEach((query, index) => {
    const wallet = wallets[index];
    if (query.data?.data) {
      membersByWallet[wallet.id] = query.data.data.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        wallet_id: m.wallet_id,
        role: m.role as "owner" | "editor" | "reader",
        email: m.email,
        phone: m.phone ?? null,
        created_at: m.created_at,
      }));
    }
  });

  // Check if current user is owner for each wallet
  useEffect(() => {
    if (!currentUserId) return;
    const ownerMap: Record<string, boolean> = {};
    Object.entries(membersByWallet).forEach(([walletId, members]) => {
      const currentUserMember = members.find((m) => m.user_id === currentUserId);
      ownerMap[walletId] = currentUserMember?.role === "owner";
    });
    setIsOwnerMap(ownerMap);
  }, [currentUserId, membersByWallet]);

  const handleRowClick = (member: WalletMember) => {
    setSelectedMember(member);
    setOpen(true);
  };

  const handleFormSuccess = () => {
    setOpen(false);
    setSelectedMember(null);
  };

  // Flatten all members for keyboard navigation
  const allMembers = Object.values(membersByWallet).flat();

  const { activeId, setActiveId } = useKeyboardListNavigation({
    items: allMembers,
    getItemId: (member) => member.id,
    onEnter: handleRowClick,
    onSpace: (member) => onToggle(member, false),
    onSelectAll: selectAll,
  });

  if (isLoading) {
    return <div className="text-muted-foreground p-4 text-sm">Loading members...</div>;
  }

  if (allMembers.length === 0) {
    return (
      <EmptyState
        title="No members found"
        description="Invite members to your wallets to get started."
      />
    );
  }

  return (
    <>
      <div className="space-y-1">
        {Object.entries(membersByWallet).map(([walletId, members]) => {
          const wallet = walletsMap.get(walletId);
          if (!wallet || members.length === 0) return null;

          return (
            <div key={walletId}>
              <RowGroupHeader title={wallet.name} />
              {members.map((member) => {
                const isSelected = selected.includes(member.id);
                return (
                  <MemberRow
                    key={member.id}
                    member={member}
                    selected={isSelected}
                    selectionMode={selected.length > 0}
                    onToggleSelect={(e) => onToggle(member, e.shiftKey)}
                    onClick={() => {
                      setActiveId(member.id);
                      handleRowClick(member);
                    }}
                    active={member.id === activeId}
                    isCurrentUser={member.user_id === currentUserId}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <DrawerDialog
        open={open}
        onOpenChange={setOpen}
        title="Edit Member"
        description="Update member information and permissions."
      >
        {selectedMember && (
          <EditMemberForm
            member={selectedMember}
            onSuccess={handleFormSuccess}
            isOwner={isOwnerMap[selectedMember.wallet_id]}
          />
        )}
      </DrawerDialog>
    </>
  );
}
