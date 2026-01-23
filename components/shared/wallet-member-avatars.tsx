"use client";

import { useQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import { getWalletMembers } from "@/utils/supabase/queries";

interface WalletMemberAvatarsProps {
  walletId: string;
  maxAvatars?: number;
  size?: "sm" | "md" | "lg";
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
}: WalletMemberAvatarsProps) {
  const { data: membersData, isLoading } = useQuery({
    queryKey: ["wallet-members", walletId],
    queryFn: async () => {
      const supabase = createClient();
      return getWalletMembers(supabase, walletId);
    },
  });

  const members: WalletMember[] = membersData?.data || [];

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

  return (
    <div className="flex items-center -space-x-2">
      {displayedMembers.map((member) => (
        <Avatar
          key={member.id}
          className={`${sizeClasses[size]} border-background border-2`}
          title={member.email || "Unknown user"}
        >
          <AvatarFallback className={sizeClasses[size]}>
            {getInitials(member.email)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <div
          className={`${sizeClasses[size]} border-background bg-muted text-muted-foreground flex items-center justify-center rounded-full border-2`}
          title={`${remainingCount} more member${remainingCount > 1 ? "s" : ""}`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
