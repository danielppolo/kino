"use client";

import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "../ui/button";

import { createClient } from "@/utils/supabase/client";
import { Wallet } from "@/utils/supabase/types";

interface ToggleWalletVisibilityProps {
  wallet: Wallet;
}

export function ToggleWalletVisibility({
  wallet,
}: ToggleWalletVisibilityProps) {
  const queryClient = useQueryClient();

  const visibilityMutation = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const supabase = await createClient();
      const { error } = await supabase
        .from("wallets")
        .update({ visible })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
  });

  const handleToggleVisibility = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await visibilityMutation.mutateAsync({
        id: wallet.id,
        visible: !wallet.visible,
      });
      toast.success(`Wallet ${wallet.visible ? "hidden" : "shown"}`);
    } catch (error) {
      console.error("Error updating wallet visibility:", error);
      toast.error("Error updating wallet visibility");
    }
  };

  return (
    <Button
      onClick={handleToggleVisibility}
      size="sm"
      disabled={visibilityMutation.isPending}
      variant="ghost"
      aria-label={`${wallet.visible ? "Hide" : "Show"} wallet`}
    >
      {wallet.visible ? (
        <Eye className="size-4" />
      ) : (
        <EyeOff className="size-4" />
      )}
    </Button>
  );
}

export default ToggleWalletVisibility;
