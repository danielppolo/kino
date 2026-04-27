export interface PlaidTransactionPreview {
  [key: string]: string | number | boolean;
  category: string;
  currency: string;
  date: string;
  datetime: string;
  amount: number;
  merchant_name: string;
  name: string;
  pending: boolean;
  plaid_transaction_id: string;
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
