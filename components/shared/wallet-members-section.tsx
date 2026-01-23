"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { createClient } from "@/utils/supabase/client";
import {
  addWalletMember,
  removeWalletMember,
  updateWalletMemberRole,
} from "@/utils/supabase/mutations";
import { getWalletMembers } from "@/utils/supabase/queries";

interface WalletMembersSectionProps {
  walletId: string;
}

type WalletMember = {
  id: string;
  user_id: string;
  wallet_id: string;
  role: "owner" | "editor" | "reader";
  email: string | null;
  created_at: string;
};

export default function WalletMembersSection({
  walletId,
}: WalletMembersSectionProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"editor" | "reader">(
    "editor",
  );
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
      return getWalletMembers(supabase, walletId);
    },
  });

  console.log(membersData);

  const members: WalletMember[] = membersData?.data || [];

  // Check if current user is owner
  useEffect(() => {
    if (currentUserId && members.length > 0) {
      const currentUserMember = members.find(
        (m) => m.user_id === currentUserId,
      );
      setIsOwner(currentUserMember?.role === "owner");
    }
  }, [currentUserId, members]);

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async () => {
      if (!newMemberEmail.trim()) {
        throw new Error("Email is required");
      }
      return await addWalletMember(
        walletId,
        newMemberEmail.trim(),
        newMemberRole,
      );
    },
    onSuccess: () => {
      toast.success("Member added successfully");
      setNewMemberEmail("");
      setNewMemberRole("editor");
      queryClient.invalidateQueries({ queryKey: ["wallet-members", walletId] });
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to add member");
      }
    },
  });

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

  const handleAddMember = () => {
    addMemberMutation.mutate();
  };

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

  if (isLoading) {
    return (
      <div className="text-muted-foreground text-sm">Loading members...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-semibold">Wallet Members</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Manage who has access to this wallet and their permissions.
        </p>
      </div>

      {isOwner && (
        <div className="space-y-2 rounded-lg border p-4">
          <h4 className="text-sm font-medium">Add Member</h4>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddMember();
                }
              }}
            />
            <Select
              value={newMemberRole}
              onValueChange={(value) =>
                setNewMemberRole(value as "editor" | "reader")
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="reader">Reader</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddMember}
              disabled={addMemberMutation.isPending || !newMemberEmail.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {isOwner && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isOwner ? 3 : 2}
                  className="text-muted-foreground text-center"
                >
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.email || "Unknown"}
                    {member.user_id === currentUserId && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        (You)
                      </span>
                    )}
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
                          (members.filter((m) => m.role === "owner").length ===
                            1 &&
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
