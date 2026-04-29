-- Keep one Plaid-linked row per Plaid transaction id, then enforce uniqueness.
-- Duplicate transaction rows are preserved; only repeated Plaid ids are cleared.
with duplicate_plaid_transactions as (
  select
    id,
    row_number() over (
      partition by plaid_transaction_id
      order by created_at desc nulls last, id desc
    ) as duplicate_rank
  from public.transactions
  where plaid_transaction_id is not null
)
update public.transactions
set plaid_transaction_id = null
where id in (
  select id
  from duplicate_plaid_transactions
  where duplicate_rank > 1
);

drop index if exists public.transactions_plaid_transaction_id_key;

create unique index transactions_plaid_transaction_id_key
  on public.transactions (plaid_transaction_id);
