"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import WalletMembersDialog from "./wallet-members-dialog";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/utils/supabase/client";
import { getAllWalletMembers } from "@/utils/supabase/queries";

interface WalletMemberAvatarsProps {
  walletId: string;
  walletName?: string;
  maxAvatars?: number;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  clickable?: boolean;
}

type WalletMember = {
  id: string;
  user_id: string;
  wallet_id: string;
  role: "owner" | "editor" | "reader";
  email: string | null;
  created_at: string;
};

export default function WalletMemberAvatars({
  walletId,
  walletName = "Wallet",
  maxAvatars = 3,
  size = "sm",
  showTooltip = true,
  clickable = false,
}: WalletMemberAvatarsProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["wallet-members", walletId],
    queryFn: async () => {
      const supabase = createClient();
      return getAllWalletMembers(supabase, [walletId]);
    },
  });

  const allMembers: WalletMember[] =
    membersData?.data?.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      wallet_id: m.wallet_id,
      role: m.role as "owner" | "editor" | "reader",
      email: m.email,
      created_at: m.created_at,
    })) || [];

  // Filter out current user from displayed avatars
  const members = allMembers.filter(
    (member) => member.user_id !== currentUserId,
  );

  if (isLoading || members.length === 0) {
    return null;
  }

  const displayedMembers = members.slice(0, maxAvatars);
  const remainingCount = members.length - maxAvatars;

  const sizeClasses = {
    sm: "h-5 w-5 text-xs",
    md: "h-6 w-6 text-xs",
    lg: "h-8 w-8 text-sm",
  };

  const handleClick = () => {
    if (clickable) {
      setDialogOpen(true);
    }
  };

  const avatarGroup = (
    <AvatarGroup>
      {displayedMembers.map((member) => (
        <Avatar
          key={member.id}
          className={`${sizeClasses[size]} border-background border-2`}
        >
          <AvatarFallback className={sizeClasses[size]} />
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <AvatarGroupCount className={sizeClasses[size]}>
          +{remainingCount}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );

  const content = clickable ? (
    <button
      onClick={handleClick}
      className="cursor-pointer transition-opacity hover:opacity-80"
      type="button"
    >
      {avatarGroup}
    </button>
  ) : (
    avatarGroup
  );

  if (!showTooltip) {
    return (
      <>
        {content}
        {clickable && (
          <WalletMembersDialog
            walletId={walletId}
            walletName={walletName}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        )}
      </>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{content}</div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              {(["owner", "editor", "reader"] as const).map((role) => {
                const roleMembers = allMembers.filter((m) => m.role === role);
                if (roleMembers.length === 0) return null;

                return (
                  <div key={role}>
                    <div className="text-muted-foreground mb-1 text-xs font-semibold capitalize">
                      {role}
                    </div>
                    <ul className="space-y-0.5 text-sm font-light">
                      {roleMembers.map((member) => (
                        <li key={member.id}>{member.email || "Unknown"}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {clickable && (
        <WalletMembersDialog
          walletId={walletId}
          walletName={walletName}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
}
