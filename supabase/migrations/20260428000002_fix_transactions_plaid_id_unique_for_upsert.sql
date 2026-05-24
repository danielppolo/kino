-- Partial unique indexes are not valid targets for INSERT ... ON CONFLICT (col)
-- (PostgREST upsert). Replace with a full unique index; multiple NULLs remain allowed.
drop index if exists public.transactions_plaid_transaction_id_key;

create unique index transactions_plaid_transaction_id_key
  on public.transactions (plaid_transaction_id);
