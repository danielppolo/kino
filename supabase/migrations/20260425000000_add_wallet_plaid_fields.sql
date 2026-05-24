alter table public.wallets
add column plaid_item_id text,
add column plaid_account_id text,
add column plaid_access_token_encrypted text,
add column plaid_institution_name text,
add column plaid_account_name text,
add column plaid_account_mask text,
add column plaid_last_refreshed_at timestamptz;
