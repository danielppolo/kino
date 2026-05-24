import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";
import type { Transaction } from "plaid";

import {
  decryptPlaidAccessToken,
  encryptPlaidAccessToken,
} from "./token-encryption";
import {
  PlaidFetchedTransaction,
  PlaidTransactionPreview,
  PlaidWalletConnection,
} from "./types";

import { Database } from "@/utils/supabase/database.types";

const PLAID_TRANSACTION_WINDOW_DAYS = 30;
const PLAID_TRANSACTION_COUNT = 500;
const PLAID_TRANSACTION_PREVIEW_LIMIT = 100;
/** Plaid may not have finished the initial Transactions pull right after Link. */
const PLAID_TRANSACTIONS_PRODUCT_READY_MAX_ATTEMPTS = 12;
const PLAID_TRANSACTIONS_PRODUCT_READY_BASE_DELAY_MS = 2000;
const DEFAULT_CLIENT_NAME = "Kino";
const DEFAULT_LANGUAGE = "en";

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];

function getPlaidEnv() {
  const value = (process.env.PLAID_ENV ?? "sandbox").toLowerCase();

  switch (value) {
    case "sandbox":
      return PlaidEnvironments.sandbox;
    case "development":
      return PlaidEnvironments.development;
    case "production":
      return PlaidEnvironments.production;
    default:
      throw new Error(`Unsupported PLAID_ENV value: ${value}`);
  }
}

function getPlaidSecret() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be configured");
  }

  return { clientId, secret };
}

export function createPlaidClient() {
  const { clientId, secret } = getPlaidSecret();

  const configuration = new Configuration({
    basePath: getPlaidEnv(),
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export async function createPlaidLinkToken({
  userId,
  walletId,
}: {
  userId: string;
  walletId: string;
}) {
  const client = createPlaidClient();
  const response = await client.linkTokenCreate({
    client_name: DEFAULT_CLIENT_NAME,
    country_codes: [CountryCode.Us],
    language: DEFAULT_LANGUAGE,
    products: [Products.Transactions],
    user: {
      client_user_id: `${userId}:${walletId}`,
    },
  });

  return response.data.link_token;
}

export async function exchangePublicToken(publicToken: string) {
  const client = createPlaidClient();
  const response = await client.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return response.data;
}

export async function getPlaidAccountDetails({
  accessToken,
  accountId,
}: {
  accessToken: string;
  accountId: string;
}) {
  const client = createPlaidClient();
  const response = await client.accountsGet({
    access_token: accessToken,
    options: {
      account_ids: [accountId],
    },
  });

  const account = response.data.accounts.find(
    (candidate) => candidate.account_id === accountId,
  );
  if (!account) {
    throw new Error("Plaid account not found");
  }

  return account;
}

export async function getPlaidAccounts({
  accessToken,
  accountIds,
}: {
  accessToken: string;
  accountIds?: string[];
}) {
  const client = createPlaidClient();
  const response = await client.accountsGet({
    access_token: accessToken,
    options: accountIds?.length
      ? {
          account_ids: accountIds,
        }
      : undefined,
  });

  return response.data;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isPlaidProductNotReadyError(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: { error_code?: string } } })
      .response?.data;
    return data?.error_code === "PRODUCT_NOT_READY";
  }
  return false;
}

export function normalizePlaidMerchantKey(value: string | null | undefined) {
  const normalized = (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  return normalized || null;
}

function mapPlaidTransaction(
  transaction: Transaction,
): PlaidFetchedTransaction {
  const datetime =
    transaction.authorized_datetime ??
    transaction.datetime ??
    `${transaction.authorized_date ?? transaction.date}T00:00:00.000Z`;
  const plaidMerchantName = transaction.merchant_name ?? null;
  const plaidCategoryPrimary =
    transaction.personal_finance_category?.primary ??
    transaction.category?.[0] ??
    null;
  const plaidMerchantKey = normalizePlaidMerchantKey(
    plaidMerchantName ?? transaction.name,
  );

  return {
    amount: transaction.amount,
    category: plaidCategoryPrimary ?? "Uncategorized",
    currency:
      transaction.iso_currency_code ??
      transaction.unofficial_currency_code ??
      "USD",
    date: transaction.authorized_date ?? transaction.date,
    datetime,
    merchant_name: transaction.merchant_name ?? "",
    name: transaction.name,
    pending: transaction.pending,
    pending_transaction_id: transaction.pending_transaction_id ?? null,
    plaid_merchant_key: plaidMerchantKey,
    plaid_merchant_name: plaidMerchantName,
    plaid_personal_finance_category_primary: plaidCategoryPrimary,
    plaid_transaction_id: transaction.transaction_id,
  };
}

export async function fetchPlaidTransactions({
  accessToken,
  accountId,
  startDate,
}: {
  accessToken: string;
  accountId: string;
  startDate?: string;
}) {
  const client = createPlaidClient();
  const endDate = new Date();
  const effectiveStartDate = startDate ? new Date(startDate) : new Date();
  if (!startDate) {
    effectiveStartDate.setDate(
      endDate.getDate() - PLAID_TRANSACTION_WINDOW_DAYS,
    );
  }

  const request = {
    access_token: accessToken,
    end_date: formatDate(endDate),
    start_date: formatDate(effectiveStartDate),
    options: {
      account_ids: [accountId],
      count: PLAID_TRANSACTION_COUNT,
      include_original_description: true,
      offset: 0,
    },
  };

  for (
    let attempt = 0;
    attempt < PLAID_TRANSACTIONS_PRODUCT_READY_MAX_ATTEMPTS;
    attempt++
  ) {
    try {
      const transactions: PlaidFetchedTransaction[] = [];
      let offset = 0;
      let totalTransactions = 0;

      do {
        const response = await client.transactionsGet({
          ...request,
          options: {
            ...request.options,
            offset,
          },
        });
        transactions.push(
          ...response.data.transactions.map(mapPlaidTransaction),
        );
        totalTransactions = response.data.total_transactions;
        offset += response.data.transactions.length;
      } while (offset < totalTransactions);

      return transactions;
    } catch (error) {
      if (!isPlaidProductNotReadyError(error)) {
        throw error;
      }
      if (attempt < PLAID_TRANSACTIONS_PRODUCT_READY_MAX_ATTEMPTS - 1) {
        await sleep(
          PLAID_TRANSACTIONS_PRODUCT_READY_BASE_DELAY_MS + attempt * 500,
        );
      }
    }
  }

  return [];
}

export function getPlaidPreviewTransactions(
  transactions: PlaidFetchedTransaction[],
) {
  return transactions
    .slice(0, PLAID_TRANSACTION_PREVIEW_LIMIT)
    .map(
      ({
        amount,
        category,
        currency,
        date,
        datetime,
        merchant_name,
        name,
        pending,
        pending_transaction_id,
        plaid_transaction_id,
      }) => ({
        amount,
        category,
        currency,
        date,
        datetime,
        merchant_name,
        name,
        pending,
        pending_transaction_id,
        plaid_transaction_id,
      }),
    );
}

export function transactionMatchesImportStart(
  transaction: Pick<PlaidFetchedTransaction, "date" | "datetime">,
  startAt: string | null,
) {
  if (!startAt) {
    return false;
  }

  if (transaction.datetime) {
    return (
      new Date(transaction.datetime).getTime() >= new Date(startAt).getTime()
    );
  }

  return transaction.date >= startAt.slice(0, 10);
}

export function serializeWalletPlaidConnection(
  wallet: Pick<
    WalletRow,
    | "plaid_account_id"
    | "plaid_account_mask"
    | "plaid_account_name"
    | "plaid_institution_name"
    | "plaid_item_id"
    | "plaid_last_refreshed_at"
    | "plaid_sync_enabled"
    | "plaid_sync_start_at"
  >,
): PlaidWalletConnection {
  if (!wallet.plaid_account_id || !wallet.plaid_item_id) {
    throw new Error("Wallet is not linked to Plaid");
  }

  return {
    plaid_account_id: wallet.plaid_account_id,
    plaid_account_mask: wallet.plaid_account_mask,
    plaid_account_name: wallet.plaid_account_name,
    plaid_institution_name: wallet.plaid_institution_name,
    plaid_item_id: wallet.plaid_item_id,
    plaid_last_refreshed_at: wallet.plaid_last_refreshed_at,
    plaid_sync_enabled: wallet.plaid_sync_enabled,
    plaid_sync_start_at: wallet.plaid_sync_start_at,
  };
}

export function encryptWalletAccessToken(accessToken: string) {
  return encryptPlaidAccessToken(accessToken);
}

export function decryptWalletAccessToken(encryptedToken: string) {
  return decryptPlaidAccessToken(encryptedToken);
}
