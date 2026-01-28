"use client";

import React, { useState } from "react";
import { Plus, MoreVertical, Trash, Edit, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { WorkspaceForm } from "@/components/shared/workspace-form";
import PageHeader from "@/components/shared/page-header";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspace } from "@/contexts/workspace-context";
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from "@/utils/supabase/mutations";
import { createClient } from "@/utils/supabase/client";

export default function WorkspacesPage() {
  const router = useRouter();
  const { workspaces, workspaceMembers, activeWorkspace, refetch } =
    useWorkspace();
  const [formOpen, setFormOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(
    null,
  );
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

  const isOwner = (workspaceId: string) => {
    return workspaceMembers.some(
      (m) =>
        m.workspace_id === workspaceId &&
        m.user_id === currentUserId &&
        m.role === "owner",
    );
  };

  const handleCreate = () => {
    setEditingWorkspace(null);
    setFormOpen(true);
  };

  const handleEdit = (workspace: { id: string; name: string }) => {
    setEditingWorkspace(workspace);
    setFormOpen(true);
  };

  const handleSubmit = async (data: { name: string }) => {
    setIsLoading(true);
    try {
      if (editingWorkspace) {
        await updateWorkspace(editingWorkspace.id, data.name);
      } else {
        await createWorkspace(data.name, currentUserId);
      }
      await refetch();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingWorkspaceId) return;

    // Check if this is the active workspace
    if (deletingWorkspaceId === activeWorkspace?.id && workspaces.length === 1) {
      toast.error("Cannot delete your only workspace");
      setDeletingWorkspaceId(null);
      return;
    }

    setIsLoading(true);
    try {
      await deleteWorkspace(deletingWorkspaceId);
      await refetch();
      toast.success("Workspace deleted!");

      // If we deleted the active workspace, the context will switch automatically
      if (deletingWorkspaceId === activeWorkspace?.id) {
        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete workspace",
      );
    } finally {
      setIsLoading(false);
      setDeletingWorkspaceId(null);
    }
  };

  return (
    <>
      <PageHeader className="justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="text-muted-foreground text-sm">
            Manage your workspaces and switch between them
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 size-4" />
          Create Workspace
        </Button>
      </PageHeader>

      <div className="space-y-4 p-6">
        {workspaces.map((workspace) => {
          const canManage = isOwner(workspace.id);

          return (
            <Card key={workspace.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {workspace.name}
                      {workspace.id === activeWorkspace?.id && (
                        <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                          Active
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Created{" "}
                      {new Date(workspace.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push("/app/settings/workspaces/members")
                      }
                    >
                      <Users className="mr-2 size-4" />
                      Members
                    </Button>

                    {canManage && (
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
                            onClick={() => handleEdit(workspace)}
                          >
                            <Edit className="mr-2 size-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingWorkspaceId(workspace.id)}
                          >
                            <Trash className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {workspaceMembers.filter(
                    (m) => m.workspace_id === workspace.id,
                  ).length}{" "}
                  member(s)
                </p>
              </CardContent>
            </Card>
          );
        })}

        {workspaces.length === 0 && (
          <Card>
            <CardContent className="flex min-h-[200px] items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  No workspaces yet
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 size-4" />
                  Create Your First Workspace
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <WorkspaceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        workspace={editingWorkspace || undefined}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      <AlertDialog
        open={!!deletingWorkspaceId}
        onOpenChange={(open) => !open && setDeletingWorkspaceId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workspace? All wallets,
              transactions, and data in this workspace will be permanently
              deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
