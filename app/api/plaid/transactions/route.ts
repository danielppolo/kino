import { NextResponse } from "next/server";

import { decryptWalletAccessToken } from "@/utils/plaid/server";
import { syncWalletPlaidTransactions } from "@/utils/plaid/sync";
import { getAuthorizedWallet } from "@/utils/plaid/wallet-access";

export async function POST(request: Request) {
  try {
    const { walletId, plaidSyncStartAt } = (await request.json()) as {
      walletId?: string;
      plaidSyncStartAt?: string | null;
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

    const wallet = authorizedWallet.wallet;
    if (wallet.wallet_type !== "bank_account") {
      return NextResponse.json(
        { error: "Only bank account wallets can fetch Plaid transactions" },
        { status: 400 },
      );
    }

    if (!wallet.plaid_access_token_encrypted || !wallet.plaid_account_id) {
      return NextResponse.json(
        { error: "Wallet is not linked to a Plaid account" },
        { status: 400 },
      );
    }

    const effectiveImportStartAt =
      plaidSyncStartAt ?? wallet.plaid_sync_start_at;
    if (!effectiveImportStartAt) {
      return NextResponse.json(
        {
          error: "Set a Plaid sync start datetime before syncing transactions",
        },
        { status: 400 },
      );
    }

    const plaidLastRefreshedAt = new Date().toISOString();
    const { data: updatedWallet, error: updateError } =
      await authorizedWallet.supabase
        .from("wallets")
        .update({
          plaid_last_refreshed_at: plaidLastRefreshedAt,
          plaid_sync_start_at: effectiveImportStartAt,
        })
        .eq("id", walletId)
        .select("*")
        .single();

    if (updateError || !updatedWallet) {
      throw (
        updateError ?? new Error("Failed to update wallet refresh timestamp")
      );
    }

    const syncResult = await syncWalletPlaidTransactions({
      supabase: authorizedWallet.supabase,
      wallet: updatedWallet,
      accessToken: decryptWalletAccessToken(
        wallet.plaid_access_token_encrypted,
      ),
      importStartAt: effectiveImportStartAt,
    });

    return NextResponse.json(syncResult);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Plaid transactions",
      },
      { status: 500 },
    );
  }
}
