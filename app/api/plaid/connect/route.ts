import { NextResponse } from "next/server";

import {
  decryptWalletAccessToken,
  getPlaidAccounts,
} from "@/utils/plaid/server";
import { syncWalletPlaidTransactions } from "@/utils/plaid/sync";
import { getAuthorizedWallet } from "@/utils/plaid/wallet-access";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      accountId?: string;
      institutionName?: string | null;
      plaidSyncStartAt?: string | null;
      sessionToken?: string;
      walletId?: string;
    };

    if (
      !body.walletId ||
      !body.accountId ||
      !body.plaidSyncStartAt ||
      !body.sessionToken
    ) {
      return NextResponse.json(
        {
          error:
            "walletId, accountId, plaidSyncStartAt, and sessionToken are required",
        },
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

    if (authorizedWallet.wallet.wallet_type !== "bank_account") {
      return NextResponse.json(
        { error: "Only bank account wallets can link Plaid accounts" },
        { status: 400 },
      );
    }

    const accessToken = decryptWalletAccessToken(body.sessionToken);
    const accountsResponse = await getPlaidAccounts({
      accessToken,
      accountIds: [body.accountId],
    });
    const account = accountsResponse.accounts.find(
      (candidate) => candidate.account_id === body.accountId,
    );

    if (!account) {
      return NextResponse.json(
        { error: "Plaid account not found" },
        { status: 404 },
      );
    }

    const { data: existingLinkedWallet } = await authorizedWallet.supabase
      .from("wallets")
      .select("id")
      .eq("plaid_account_id", body.accountId)
      .neq("id", body.walletId)
      .maybeSingle();

    if (existingLinkedWallet) {
      const { error: unlinkError } = await authorizedWallet.supabase
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
        .eq("id", existingLinkedWallet.id);

      if (unlinkError) {
        throw unlinkError;
      }
    }

    const plaidLastRefreshedAt = new Date().toISOString();
    const { data: wallet, error: updateError } = await authorizedWallet.supabase
      .from("wallets")
      .update({
        plaid_access_token_encrypted: body.sessionToken,
        plaid_account_id: body.accountId,
        plaid_account_mask: account.mask ?? null,
        plaid_account_name: account.official_name ?? account.name ?? null,
        plaid_institution_name: body.institutionName ?? null,
        plaid_item_id: accountsResponse.item.item_id,
        plaid_last_refreshed_at: plaidLastRefreshedAt,
        plaid_sync_enabled: true,
        plaid_sync_start_at: body.plaidSyncStartAt,
      })
      .eq("id", body.walletId)
      .select("*")
      .single();

    if (updateError || !wallet) {
      throw updateError ?? new Error("Failed to update wallet");
    }

    const syncResult = await syncWalletPlaidTransactions({
      supabase: authorizedWallet.supabase,
      wallet,
      accessToken,
      importStartAt: body.plaidSyncStartAt,
    });

    return NextResponse.json(syncResult);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect Plaid account",
      },
      { status: 500 },
    );
  }
}
