alter table public.wallets
add column plaid_sync_enabled boolean not null default true;
