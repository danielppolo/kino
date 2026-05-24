create table public.plaid_ignored_transaction_ids (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  plaid_transaction_id text not null,
  deleted_transaction_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index plaid_ignored_transaction_ids_wallet_plaid_id_key
  on public.plaid_ignored_transaction_ids (wallet_id, plaid_transaction_id);

create index plaid_ignored_transaction_ids_wallet_id_idx
  on public.plaid_ignored_transaction_ids (wallet_id);

create or replace function public.set_plaid_ignored_transaction_ids_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger plaid_ignored_transaction_ids_set_updated_at
before update on public.plaid_ignored_transaction_ids
for each row
execute function public.set_plaid_ignored_transaction_ids_updated_at();

alter table public.plaid_ignored_transaction_ids enable row level security;

create policy "plaid_ignored_transaction_ids_select"
on public.plaid_ignored_transaction_ids
for select to authenticated
using (
  exists (
    select 1
    from public.user_wallets
    where public.user_wallets.user_id = auth.uid()
      and public.user_wallets.wallet_id = public.plaid_ignored_transaction_ids.wallet_id
  )
);

create policy "plaid_ignored_transaction_ids_insert"
on public.plaid_ignored_transaction_ids
for insert to authenticated
with check (
  exists (
    select 1
    from public.user_wallets
    where public.user_wallets.user_id = auth.uid()
      and public.user_wallets.wallet_id = public.plaid_ignored_transaction_ids.wallet_id
      and public.user_wallets.role in ('owner', 'editor')
  )
);

create policy "plaid_ignored_transaction_ids_update"
on public.plaid_ignored_transaction_ids
for update to authenticated
using (
  exists (
    select 1
    from public.user_wallets
    where public.user_wallets.user_id = auth.uid()
      and public.user_wallets.wallet_id = public.plaid_ignored_transaction_ids.wallet_id
      and public.user_wallets.role in ('owner', 'editor')
  )
)
with check (true);

create policy "plaid_ignored_transaction_ids_delete"
on public.plaid_ignored_transaction_ids
for delete to authenticated
using (
  exists (
    select 1
    from public.user_wallets
    where public.user_wallets.user_id = auth.uid()
      and public.user_wallets.wallet_id = public.plaid_ignored_transaction_ids.wallet_id
      and public.user_wallets.role in ('owner', 'editor')
  )
);

create or replace function public.delete_transactions_with_plaid_ignore(
  transaction_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if transaction_ids is null or cardinality(transaction_ids) = 0 then
    return;
  end if;

  with transactions_to_delete as (
    select
      id,
      wallet_id,
      plaid_transaction_id,
      plaid_pending_transaction_id
    from public.transactions
    where id = any(transaction_ids)
  ),
  plaid_ids_to_ignore as (
    select
      wallet_id,
      id as deleted_transaction_id,
      plaid_transaction_id
    from transactions_to_delete
    where plaid_transaction_id is not null

    union

    select
      wallet_id,
      id as deleted_transaction_id,
      plaid_pending_transaction_id as plaid_transaction_id
    from transactions_to_delete
    where plaid_pending_transaction_id is not null
  )
  insert into public.plaid_ignored_transaction_ids (
    wallet_id,
    plaid_transaction_id,
    deleted_transaction_id
  )
  select
    wallet_id,
    plaid_transaction_id,
    deleted_transaction_id
  from plaid_ids_to_ignore
  on conflict (wallet_id, plaid_transaction_id) do update
  set
    deleted_transaction_id = excluded.deleted_transaction_id,
    updated_at = timezone('utc', now());

  delete from public.transactions
  where id = any(transaction_ids);
end;
$$;
