import { NextResponse } from "next/server";

import {
  encryptWalletAccessToken,
  exchangePublicToken,
  getPlaidAccountDetails,
} from "@/utils/plaid/server";
import { syncWalletPlaidTransactions } from "@/utils/plaid/sync";
import { getAuthorizedWallet } from "@/utils/plaid/wallet-access";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      accountId?: string;
      accountMask?: string | null;
      accountName?: string | null;
      institutionName?: string | null;
      plaidSyncStartAt?: string | null;
      publicToken?: string;
      walletId?: string;
    };

    if (
      !body.walletId ||
      !body.publicToken ||
      !body.accountId ||
      !body.plaidSyncStartAt
    ) {
      return NextResponse.json(
        {
          error:
            "walletId, publicToken, accountId, and plaidSyncStartAt are required",
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

    const exchanged = await exchangePublicToken(body.publicToken);
    const account = await getPlaidAccountDetails({
      accessToken: exchanged.access_token,
      accountId: body.accountId,
    });

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
          plaid_sync_start_at: null,
        })
        .eq("id", existingLinkedWallet.id);

      if (unlinkError) {
        throw unlinkError;
      }
    }

    const plaidLastRefreshedAt = new Date().toISOString();
    const walletUpdate = {
      plaid_access_token_encrypted: encryptWalletAccessToken(
        exchanged.access_token,
      ),
      plaid_account_id: body.accountId,
      plaid_account_mask: account.mask ?? body.accountMask ?? null,
      plaid_account_name:
        account.official_name ?? account.name ?? body.accountName ?? null,
      plaid_institution_name: body.institutionName ?? null,
      plaid_item_id: exchanged.item_id,
      plaid_last_refreshed_at: plaidLastRefreshedAt,
      plaid_sync_start_at: body.plaidSyncStartAt,
    };

    const { data: wallet, error: updateError } = await authorizedWallet.supabase
      .from("wallets")
      .update(walletUpdate)
      .eq("id", body.walletId)
      .select("*")
      .single();

    if (updateError || !wallet) {
      throw updateError ?? new Error("Failed to update wallet");
    }

    const syncResult = await syncWalletPlaidTransactions({
      supabase: authorizedWallet.supabase,
      wallet,
      accessToken: exchanged.access_token,
      importStartAt: body.plaidSyncStartAt,
    });

    return NextResponse.json(syncResult);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to exchange Plaid public token",
      },
      { status: 500 },
    );
  }
}
