import { NextResponse } from "next/server";

import { getAuthorizedWallet } from "@/utils/plaid/wallet-access";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      enabled?: boolean;
      walletId?: string;
    };

    if (!body.walletId || typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "walletId and enabled are required" },
        { status: 400 },
      );
    }

    const authorizedWallet = await getAuthorizedWallet(body.walletId);
    if ("error" in authorizedWallet) {
      return NextResponse.json(
        { error: authorizedWallet.error },
        { status: authorizedWallet.status },
      );
    }

    if (!authorizedWallet.wallet.plaid_account_id) {
      return NextResponse.json(
        { error: "Wallet is not linked to a Plaid account" },
        { status: 400 },
      );
    }

    const { data: wallet, error } = await authorizedWallet.supabase
      .from("wallets")
      .update({
        plaid_sync_enabled: body.enabled,
      })
      .eq("id", body.walletId)
      .select("*")
      .single();

    if (error || !wallet) {
      throw error ?? new Error("Failed to update Plaid sync status");
    }

    return NextResponse.json({ wallet });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update Plaid connection",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { walletId } = (await request.json()) as {
      walletId?: string;
    };

    if (!walletId) {
      return NextResponse.json(
        { error: "walletId is required" },
        { status: 400 },
      );
    }

    const authorizedWallet = await getAuthorizedWallet(walletId);
    if ("error" in authorizedWallet) {
      return NextResponse.json(
        { error: authorizedWallet.error },
        { status: authorizedWallet.status },
      );
    }

    const { data: wallet, error } = await authorizedWallet.supabase
      .from("wallets")
      .update({
        plaid_access_token_encrypted: null,
        plaid_account_id: null,
        plaid_account_mask: null,
        plaid_account_name: null,
        plaid_institution_name: null,
        plaid_item_id: null,
        plaid_last_refreshed_at: null,
        plaid_sync_enabled: true,
        plaid_sync_start_at: null,
      })
      .eq("id", walletId)
      .select("*")
      .single();

    if (error || !wallet) {
      throw error ?? new Error("Failed to disconnect Plaid account");
    }

    return NextResponse.json({ wallet });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to disconnect Plaid account",
      },
      { status: 500 },
    );
  }
}
