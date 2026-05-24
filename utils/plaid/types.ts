export interface PlaidTransactionPreview {
  [key: string]: string | number | boolean | null;
  category: string;
  currency: string;
  date: string;
  datetime: string;
  amount: number;
  merchant_name: string;
  name: string;
  pending: boolean;
  pending_transaction_id: string | null;
  plaid_transaction_id: string;
}

export interface PlaidFetchedTransaction extends PlaidTransactionPreview {
  plaid_merchant_key: string | null;
  plaid_merchant_name: string | null;
  plaid_personal_finance_category_primary: string | null;
}

export interface PlaidPreviewAccount {
  id: string;
  institution_name: string | null;
  mask: string | null;
  name: string | null;
  plaid_item_id: string;
  session_token: string;
  transactions: PlaidTransactionPreview[];
}

export interface PlaidWalletConnection {
  plaid_account_id: string;
  plaid_account_mask: string | null;
  plaid_account_name: string | null;
  plaid_institution_name: string | null;
  plaid_item_id: string;
  plaid_last_refreshed_at: string | null;
  plaid_sync_enabled: boolean;
  plaid_sync_start_at: string | null;
}

export interface PlaidTransactionsResponse {
  connection: PlaidWalletConnection;
  importedCount: number;
  transactions: PlaidTransactionPreview[];
}

export interface PlaidPreviewResponse {
  accounts: PlaidPreviewAccount[];
}
