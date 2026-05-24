import { NextResponse } from "next/server";

import {
  encryptWalletAccessToken,
  exchangePublicToken,
  fetchPlaidTransactions,
  getPlaidAccounts,
  getPlaidPreviewTransactions,
} from "@/utils/plaid/server";
import { PlaidPreviewResponse } from "@/utils/plaid/types";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const { publicToken, institutionName } = (await request.json()) as {
      institutionName?: string | null;
      publicToken?: string;
    };

    if (!publicToken) {
      return NextResponse.json(
        { error: "publicToken is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exchanged = await exchangePublicToken(publicToken);
    const encryptedSessionToken = encryptWalletAccessToken(
      exchanged.access_token,
    );
    const accountsResponse = await getPlaidAccounts({
      accessToken: exchanged.access_token,
    });

    const accounts = await Promise.all(
      accountsResponse.accounts.map(async (account) => {
        const transactions = await fetchPlaidTransactions({
          accessToken: exchanged.access_token,
          accountId: account.account_id,
        });

        return {
          id: account.account_id,
          institution_name: institutionName ?? null,
          mask: account.mask ?? null,
          name: account.official_name ?? account.name ?? null,
          plaid_item_id: accountsResponse.item.item_id,
          session_token: encryptedSessionToken,
          transactions: getPlaidPreviewTransactions(transactions),
        };
      }),
    );

    return NextResponse.json({
      accounts,
    } satisfies PlaidPreviewResponse);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to preview Plaid accounts",
      },
      { status: 500 },
    );
  }
}
