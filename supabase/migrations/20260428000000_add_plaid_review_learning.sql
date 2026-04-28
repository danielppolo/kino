alter table public.transactions
add column plaid_merchant_name text,
add column plaid_merchant_key text,
add column plaid_personal_finance_category_primary text;

update public.transactions
set
  plaid_merchant_name = coalesce(plaid_merchant_name, description),
  plaid_merchant_key = case
    when plaid_merchant_key is not null then plaid_merchant_key
    when coalesce(description, '') = '' then null
    else trim(regexp_replace(lower(description), '[^a-z0-9]+', ' ', 'g'))
  end
where plaid_transaction_id is not null;

create table public.plaid_transaction_rules (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  merchant_key text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index plaid_transaction_rules_wallet_id_merchant_key_key
  on public.plaid_transaction_rules (wallet_id, merchant_key);

create index plaid_transaction_rules_wallet_id_idx
  on public.plaid_transaction_rules (wallet_id);

create or replace function public.set_plaid_transaction_rules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger plaid_transaction_rules_set_updated_at
before update on public.plaid_transaction_rules
for each row
execute function public.set_plaid_transaction_rules_updated_at();

alter table public.plaid_transaction_rules enable row level security;

create policy "plaid_transaction_rules_select" on public.plaid_transaction_rules
for select to authenticated
using (
  exists (
    select 1
    from public.wallets
    join public.user_wallets on public.wallets.id = public.user_wallets.wallet_id
    where public.user_wallets.user_id = auth.uid()
      and public.user_wallets.wallet_id = public.plaid_transaction_rules.wallet_id
  )
);

create policy "plaid_transaction_rules_insert" on public.plaid_transaction_rules
for insert to authenticated
with check (
  exists (
    select 1
    from public.wallets
    join public.user_wallets on public.wallets.id = public.user_wallets.wallet_id
    where public.user_wallets.user_id = auth.uid()
      and public.user_wallets.wallet_id = public.plaid_transaction_rules.wallet_id
      and public.user_wallets.role in ('owner', 'editor')
  )
);

create policy "plaid_transaction_rules_update" on public.plaid_transaction_rules
for update to authenticated
using (
  exists (
    select 1
    from public.wallets
    join public.user_wallets on public.wallets.id = public.user_wallets.wallet_id
    where public.user_wallets.user_id = auth.uid()
      and public.user_wallets.wallet_id = public.plaid_transaction_rules.wallet_id
      and public.user_wallets.role in ('owner', 'editor')
  )
)
with check (true);

create policy "plaid_transaction_rules_delete" on public.plaid_transaction_rules
for delete to authenticated
using (
  exists (
    select 1
    from public.wallets
    join public.user_wallets on public.wallets.id = public.user_wallets.wallet_id
    where public.user_wallets.user_id = auth.uid()
      and public.user_wallets.wallet_id = public.plaid_transaction_rules.wallet_id
      and public.user_wallets.role in ('owner', 'editor')
  )
);

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
