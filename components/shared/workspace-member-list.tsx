"use client";

import React, { useState } from "react";
import { MoreVertical, Trash } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: "owner" | "editor" | "reader";
  user?: {
    email: string;
  };
}

interface WorkspaceMemberListProps {
  members: WorkspaceMember[];
  currentUserId: string;
  isOwner: boolean;
  onUpdateRole: (memberId: string, role: "owner" | "editor" | "reader") => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  isLoading?: boolean;
}

export function WorkspaceMemberList({
  members,
  currentUserId,
  isOwner,
  onUpdateRole,
  onRemoveMember,
  isLoading,
}: WorkspaceMemberListProps) {
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const ownerCount = members.filter((m) => m.role === "owner").length;
  const currentMember = members.find((m) => m.user_id === currentUserId);

  const handleRoleChange = async (memberId: string, newRole: "owner" | "editor" | "reader") => {
    setUpdatingMemberId(memberId);
    try {
      await onUpdateRole(memberId, newRole);
      toast.success("Member role updated!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role",
      );
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    // Check if this is the last owner
    if (member.role === "owner" && ownerCount === 1) {
      toast.error("Cannot remove the last owner. Promote another member first.");
      setDeletingMemberId(null);
      return;
    }

    try {
      await onRemoveMember(memberId);
      toast.success("Member removed!");
      setDeletingMemberId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member",
      );
      setDeletingMemberId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Manage workspace members and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              const canEdit = isOwner && !isCurrentUser;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {member.user?.email || "Unknown User"}
                      {isCurrentUser && (
                        <span className="text-muted-foreground ml-2 text-sm">
                          (You)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          handleRoleChange(
                            member.id,
                            value as "owner" | "editor" | "reader",
                          )
                        }
                        disabled={updatingMemberId === member.id || isLoading}
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
                      <span className="text-muted-foreground w-[120px] text-sm capitalize">
                        {member.role}
                      </span>
                    )}

                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isLoading}
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingMemberId(member.id)}
                          >
                            <Trash className="mr-2 size-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}

            {members.length === 0 && (
              <p className="text-muted-foreground text-center text-sm">
                No members yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deletingMemberId}
        onOpenChange={(open) => !open && setDeletingMemberId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the workspace?
              They will lose access to all data in this workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingMemberId && handleRemoveMember(deletingMemberId)
              }
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
