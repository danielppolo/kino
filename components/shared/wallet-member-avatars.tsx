"use client";

import { useQuery } from "@tanstack/react-query";

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
import { getWalletMembers } from "@/utils/supabase/queries";

interface WalletMemberAvatarsProps {
  walletId: string;
  maxAvatars?: number;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
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
  maxAvatars = 3,
  size = "sm",
  showTooltip = true,
}: WalletMemberAvatarsProps) {
  const { data: membersData, isLoading } = useQuery({
    queryKey: ["wallet-members", walletId],
    queryFn: async () => {
      const supabase = createClient();
      return getWalletMembers(supabase, walletId);
    },
  });

  const members: WalletMember[] =
    membersData?.data?.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      wallet_id: m.wallet_id,
      role: m.role as "owner" | "editor" | "reader",
      email: m.email,
      created_at: m.created_at,
    })) || [];

  if (isLoading || members.length === 0) {
    return null;
  }

  const displayedMembers = members.slice(0, maxAvatars);
  const remainingCount = members.length - maxAvatars;

  const getInitials = (email: string | null) => {
    if (!email) return "?";
    const parts = email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const sizeClasses = {
    sm: "h-5 w-5 text-xs",
    md: "h-6 w-6 text-xs",
    lg: "h-8 w-8 text-sm",
  };

  const avatarGroup = (
    <AvatarGroup>
      {displayedMembers.map((member) => (
        <Avatar key={member.id} className={`${sizeClasses[size]} border-2 border-background`}>
          <AvatarFallback className={sizeClasses[size]}>
            {getInitials(member.email)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <AvatarGroupCount className={sizeClasses[size]}>
          +{remainingCount}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );

  if (!showTooltip) {
    return avatarGroup;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{avatarGroup}</div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">All members:</p>
            <ul className="list-inside space-y-0.5 text-sm">
              {members.map((member) => (
                <li key={member.id}>
                  {member.email || "Unknown"} ({member.role})
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
