import {
  AuthRequiredError,
  ForbiddenError,
  NotFoundError,
  requireWalletAccess,
} from "@/utils/auth/server";

export async function getAuthorizedWallet(walletId: string) {
  try {
    return await requireWalletAccess({ walletId });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return { error: "Unauthorized", status: 401 as const };
    }

    if (error instanceof NotFoundError) {
      return { error: "Wallet not found", status: 404 as const };
    }

    if (error instanceof ForbiddenError) {
      return { error: "Forbidden", status: 403 as const };
    }

    throw error;
  }
}
