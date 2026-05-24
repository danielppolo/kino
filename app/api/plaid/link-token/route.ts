import { NextResponse } from "next/server";

import { createPlaidLinkToken } from "@/utils/plaid/server";
import { createClient } from "@/utils/supabase/server";
import { getAuthorizedWallet } from "@/utils/plaid/wallet-access";

export async function POST(request: Request) {
  try {
    const { walletId } = (await request.json()) as {
      walletId?: string;
    };

    let userId: string | null = null;

    if (walletId) {
      const authorizedWallet = await getAuthorizedWallet(walletId);
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

      userId = authorizedWallet.user.id;
    } else {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      userId = user.id;
    }

    const linkToken = await createPlaidLinkToken({
      userId,
      walletId: walletId ?? "integrations",
    });

    return NextResponse.json({ linkToken });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Plaid link token",
      },
      { status: 500 },
    );
  }
}
