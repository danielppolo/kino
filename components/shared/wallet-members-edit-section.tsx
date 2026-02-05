"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/utils/supabase/client";
import {
  removeWalletMember,
  updateUserPhone,
  updateWalletMemberRole,
} from "@/utils/supabase/mutations";
import { getAllWalletMembers } from "@/utils/supabase/queries";

interface WalletMembersEditSectionProps {
  walletId: string;
}

type WalletMember = {
  id: string;
  user_id: string;
  wallet_id: string;
  role: "owner" | "editor" | "reader";
  email: string | null;
  phone: string | null;
  created_at: string;
};

export default function WalletMembersEditSection({
  walletId,
}: WalletMembersEditSectionProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [phoneByMemberId, setPhoneByMemberId] = useState<
    Record<string, string>
  >({});
  const queryClient = useQueryClient();

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

  // Fetch wallet members
  const { data: membersData, isLoading } = useQuery({
    queryKey: ["wallet-members", walletId],
    queryFn: async () => {
      const supabase = createClient();
      return getAllWalletMembers(supabase, [walletId]);
    },
  });

  const raw = membersData?.data;
  const members: WalletMember[] = Array.isArray(raw)
    ? raw.map(
        (m: {
          id: string;
          user_id: string;
          wallet_id: string;
          role: string;
          email: string | null;
          phone: string | null;
          created_at: string | null;
        }) => ({
          id: m.id,
          user_id: m.user_id,
          wallet_id: m.wallet_id,
          role: m.role as "owner" | "editor" | "reader",
          email: m.email,
          phone: m.phone ?? null,
          created_at: m.created_at ?? "",
        }),
      )
    : [];

  useEffect(() => {
    const nextPhones = members.reduce<Record<string, string>>((acc, member) => {
      acc[member.id] = member.phone ?? "";
      return acc;
    }, {});
    setPhoneByMemberId(nextPhones);
  }, [members]);

  // Check if current user is owner
  useEffect(() => {
    if (currentUserId && members.length > 0) {
      const currentUserMember = members.find(
        (m) => m.user_id === currentUserId,
      );
      setIsOwner(currentUserMember?.role === "owner");
    }
  }, [currentUserId, members]);

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      id,
      role,
    }: {
      id: string;
      role: "owner" | "editor" | "reader";
    }) => {
      return await updateWalletMemberRole(id, role);
    },
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["wallet-members", walletId] });
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update role");
      }
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if this is the last owner
      const owners = members.filter((m) => m.role === "owner");
      const memberToRemove = members.find((m) => m.id === id);
      if (owners.length === 1 && memberToRemove?.role === "owner") {
        throw new Error("Cannot remove the last owner");
      }
      return await removeWalletMember(id);
    },
    onSuccess: () => {
      toast.success("Member removed successfully");
      queryClient.invalidateQueries({ queryKey: ["wallet-members", walletId] });
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to remove member");
      }
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async ({
      userId,
      phone,
    }: {
      userId: string;
      phone: string | null;
    }) => {
      return await updateUserPhone(userId, phone);
    },
    onSuccess: () => {
      toast.success("Phone updated successfully");
      queryClient.invalidateQueries({ queryKey: ["wallet-members", walletId] });
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update phone");
      }
    },
  });

  const handleRoleChange = (
    memberId: string,
    newRole: "owner" | "editor" | "reader",
  ) => {
    updateRoleMutation.mutate({ id: memberId, role: newRole });
  };

  const handleRemoveMember = (memberId: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      removeMemberMutation.mutate(memberId);
    }
  };

  const handlePhoneChange = (memberId: string, value: string) => {
    setPhoneByMemberId((prev) => ({ ...prev, [memberId]: value }));
  };

  const handlePhoneSave = (member: WalletMember) => {
    if (member.user_id !== currentUserId) return;
    const nextPhone = phoneByMemberId[member.id]?.trim() ?? "";
    const currentPhone = member.phone ?? "";
    if (nextPhone === currentPhone) return;
    updatePhoneMutation.mutate({
      userId: member.user_id,
      phone: nextPhone.length > 0 ? nextPhone : null,
    });
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm">Loading members...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              {isOwner && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isOwner ? 4 : 3}
                  className="text-muted-foreground text-center"
                >
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => {
                const getInitials = (email: string | null) => {
                  if (!email) return "?";
                  const parts = email.split("@")[0].split(/[._-]/);
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[1][0]).toUpperCase();
                  }
                  return email.substring(0, 2).toUpperCase();
                };

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {getInitials(member.email)}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{member.email || "Unknown"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="font-medium">
                          {member.email || "Unknown"}
                          {member.user_id === currentUserId && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              (You)
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="tel"
                        placeholder="Add phone"
                        value={phoneByMemberId[member.id] ?? ""}
                        onChange={(e) =>
                          handlePhoneChange(member.id, e.target.value)
                        }
                        onBlur={() => handlePhoneSave(member)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            handlePhoneSave(member);
                          }
                        }}
                        disabled={
                          member.user_id !== currentUserId ||
                          updatePhoneMutation.isPending
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {isOwner ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleRoleChange(
                              member.id,
                              value as "owner" | "editor" | "reader",
                            )
                          }
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="reader">Reader</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="capitalize">{member.role}</span>
                      )}
                    </TableCell>
                    {isOwner && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={
                            removeMemberMutation.isPending ||
                            (members.filter((m) => m.role === "owner")
                              .length === 1 &&
                              member.role === "owner")
                          }
                          title={
                            members.filter((m) => m.role === "owner").length ===
                              1 && member.role === "owner"
                              ? "Cannot remove the last owner"
                              : "Remove member"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
