import { createClient } from "@/utils/supabase/server";

export async function getAuthorizedWallet(walletId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("*")
    .eq("id", walletId)
    .single();

  if (walletError || !wallet) {
    return { error: "Wallet not found", status: 404 as const };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", wallet.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    return { error: "Forbidden", status: 403 as const };
  }

  return { supabase, user, wallet };
}
