"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addWalletMember } from "@/utils/supabase/mutations";

interface InviteMemberFormProps {
  walletId: string;
  onSuccess?: () => void;
}

export default function InviteMemberForm({
  walletId,
  onSuccess,
}: InviteMemberFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "reader">("editor");
  const queryClient = useQueryClient();

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim()) {
        throw new Error("Email is required");
      }
      return await addWalletMember(walletId, email.trim(), role);
    },
    onSuccess: () => {
      toast.success("Member invited successfully");
      setEmail("");
      setRole("editor");
      queryClient.invalidateQueries({ queryKey: ["wallet-members"] });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to invite member");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMemberMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={role}
          onValueChange={(value) => setRole(value as "editor" | "reader")}
        >
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="reader">Reader</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {role === "editor"
            ? "Can view and edit transactions"
            : "Can only view transactions"}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={addMemberMutation.isPending || !email.trim()}
        >
          {addMemberMutation.isPending ? "Inviting..." : "Invite Member"}
        </Button>
      </div>
    </form>
  );
}
