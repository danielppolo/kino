"use client";

import React from "react";

import { Text } from "../ui/typography";
import SelectableRow from "./selectable-row";

import { Badge } from "@/components/ui/badge";

type WalletMember = {
  id: string;
  user_id: string;
  wallet_id: string;
  role: "owner" | "editor" | "reader";
  email: string | null;
  phone: string | null;
  created_at: string;
};

interface MemberRowProps {
  member: WalletMember;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (event: React.MouseEvent<HTMLDivElement>) => void;
  active?: boolean;
  isCurrentUser?: boolean;
}

export function MemberRow({
  member,
  onClick,
  selected = false,
  selectionMode = false,
  onToggleSelect,
  active = false,
  isCurrentUser = false,
}: MemberRowProps) {
  const getInitials = (email: string | null) => {
    if (!email) return "?";
    const parts = email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "editor":
        return "secondary";
      case "reader":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <SelectableRow
      id={member.id}
      onClick={onClick}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      active={active}
    >
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Text className="truncate font-medium">
                {member.email || "Unknown"}
              </Text>
              {isCurrentUser && (
                <span className="text-muted-foreground text-xs">(You)</span>
              )}
            </div>
            {member.phone && (
              <Text className="text-muted-foreground truncate text-xs">
                {member.phone}
              </Text>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={getRoleBadgeVariant(member.role)}
            className="capitalize"
          >
            {member.role}
          </Badge>
        </div>
      </div>
    </SelectableRow>
  );
}

export function MemberRowLoading() {
  return (
    <div className="flex h-10 items-center gap-2 px-4">
      <div className="bg-muted h-6 w-6 animate-pulse rounded-full" />
      <div className="bg-muted h-4 w-48 animate-pulse rounded" />
      <div className="bg-muted h-4 w-16 animate-pulse rounded" />
    </div>
  );
}

export default MemberRow;
