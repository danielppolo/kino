"use client";

import { useEffect, useState } from "react";
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
import { createClient } from "@/utils/supabase/client";
import {
  updateWalletMemberRole,
  updateUserPhone,
} from "@/utils/supabase/mutations";

type WalletMember = {
  id: string;
  user_id: string;
  wallet_id: string;
  role: "owner" | "editor" | "reader";
  email: string | null;
  phone: string | null;
  created_at: string;
};

interface EditMemberFormProps {
  member: WalletMember;
  onSuccess?: () => void;
  isOwner?: boolean;
}

export default function EditMemberForm({
  member,
  onSuccess,
  isOwner = false,
}: EditMemberFormProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [role, setRole] = useState(member.role);
  const [phone, setPhone] = useState(member.phone || "");
  const queryClient = useQueryClient();

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

  const isCurrentUser = currentUserId === member.user_id;

  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: "owner" | "editor" | "reader") => {
      return await updateWalletMemberRole(member.id, newRole);
    },
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["wallet-members"] });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update role");
      }
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async (newPhone: string | null) => {
      return await updateUserPhone(member.user_id, newPhone);
    },
    onSuccess: () => {
      toast.success("Phone updated successfully");
      queryClient.invalidateQueries({ queryKey: ["wallet-members"] });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update phone");
      }
    },
  });

  const handleSave = () => {
    const promises = [];

    if (isOwner && role !== member.role) {
      promises.push(updateRoleMutation.mutateAsync(role));
    }

    if (isCurrentUser && phone !== (member.phone || "")) {
      promises.push(
        updatePhoneMutation.mutateAsync(phone.trim() || null),
      );
    }

    if (promises.length === 0) {
      onSuccess?.();
      return;
    }

    Promise.all(promises);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={member.email || "Unknown"} disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Add phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={!isCurrentUser}
        />
        {!isCurrentUser && (
          <p className="text-muted-foreground text-xs">
            You can only edit your own phone number
          </p>
        )}
      </div>

      {isOwner && (
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            value={role}
            onValueChange={(value) =>
              setRole(value as "owner" | "editor" | "reader")
            }
          >
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="reader">Reader</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={
            updateRoleMutation.isPending || updatePhoneMutation.isPending
          }
        >
          {updateRoleMutation.isPending || updatePhoneMutation.isPending
            ? "Saving..."
            : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
