alter table public.transactions
add column if not exists plaid_pending_transaction_id text;

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

drop view if exists public.transaction_list;

create view public.transaction_list
with (security_invoker = on)
as
select
  t.id,
  t.created_at,
  t.description,
  t.amount_cents,
  t.base_amount_cents,
  t.date,
  t.currency,
  t.type,
  t.wallet_id,
  t.category_id,
  t.label_id,
  t.transfer_id,
  t.note,
  t.plaid_transaction_id,
  t.plaid_pending_transaction_id,
  t.plaid_merchant_name,
  t.plaid_merchant_key,
  t.plaid_personal_finance_category_primary,
  case
    when t.type in ('income', 'expense')
      and (t.category_id is null or t.label_id is null)
    then true
    else false
  end as needs_review,
  array_remove(array_agg(distinct tg.title), null) as tags,
  array_remove(array_agg(distinct tg.id), null) as tag_ids,
  case
    when t.type = 'transfer' and t.transfer_id is not null
    then get_transfer_wallet_id(t.transfer_id, t.id)
    else null
  end as transfer_wallet_id
from public.transactions t
left join public.transaction_tags tt on t.id = tt.transaction_id
left join public.tags tg on tg.id = tt.tag_id
group by t.id;
