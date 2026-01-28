"use client";

import React, { useState } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { AddMemberForm } from "@/components/shared/add-member-form";
import { WorkspaceMemberList } from "@/components/shared/workspace-member-list";
import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/workspace-context";
import {
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from "@/utils/supabase/mutations";
import { createClient } from "@/utils/supabase/client";

interface MemberWithEmail {
  id: string;
  user_id: string;
  workspace_id: string;
  role: "owner" | "editor" | "reader";
  user?: {
    email: string;
  };
}

export default function WorkspaceMembersPage() {
  const router = useRouter();
  const { activeWorkspace, workspaceMembers, refetch } = useWorkspace();
  const [formOpen, setFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get current user
  const [currentUserId, setCurrentUserId] = React.useState<string>("");

  React.useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  // Fetch members with email addresses
  const { data: membersWithEmails = [], refetch: refetchMembers } = useQuery<
    MemberWithEmail[]
  >({
    queryKey: ["workspace-members-with-emails", activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("workspace_members")
        .select(
          `
          id,
          user_id,
          workspace_id,
          role,
          user:user_id (
            email
          )
        `,
        )
        .eq("workspace_id", activeWorkspace.id);

      if (error) throw error;

      // Transform the data to match our interface
      return (data || []).map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        workspace_id: member.workspace_id,
        role: member.role,
        user: Array.isArray(member.user)
          ? member.user[0]
          : member.user || undefined,
      }));
    },
    enabled: !!activeWorkspace?.id,
  });

  const currentMember = workspaceMembers.find(
    (m) => m.user_id === currentUserId,
  );
  const isOwner = currentMember?.role === "owner";

  const handleAddMember = async (data: {
    email: string;
    role: "owner" | "editor" | "reader";
  }) => {
    if (!activeWorkspace) return;

    setIsLoading(true);
    try {
      await addWorkspaceMember(activeWorkspace.id, data.email, data.role);
      await Promise.all([refetch(), refetchMembers()]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (
    memberId: string,
    role: "owner" | "editor" | "reader",
  ) => {
    setIsLoading(true);
    try {
      await updateWorkspaceMemberRole(memberId, role);
      await Promise.all([refetch(), refetchMembers()]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setIsLoading(true);
    try {
      await removeWorkspaceMember(memberId);
      await Promise.all([refetch(), refetchMembers()]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeWorkspace) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <PageHeader className="justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/app/settings/workspaces")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {activeWorkspace.name} Members
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage workspace members and permissions
            </p>
          </div>
        </div>
        {isOwner && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Member
          </Button>
        )}
      </PageHeader>

      <div className="space-y-4 p-6">
        <WorkspaceMemberList
          members={membersWithEmails}
          currentUserId={currentUserId}
          isOwner={isOwner}
          onUpdateRole={handleUpdateRole}
          onRemoveMember={handleRemoveMember}
          isLoading={isLoading}
        />
      </div>

      {isOwner && (
        <AddMemberForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleAddMember}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
