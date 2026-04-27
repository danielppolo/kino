alter table public.wallets
add column plaid_sync_start_at timestamptz;

alter table public.transactions
add column plaid_transaction_id text;

create unique index if not exists transactions_plaid_transaction_id_key
on public.transactions (plaid_transaction_id)
where plaid_transaction_id is not null;

create unique index if not exists wallets_plaid_account_id_key
on public.wallets (plaid_account_id)
where plaid_account_id is not null;
