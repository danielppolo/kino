-- Create recurrent_bills table
create table public.recurrent_bills (
  id uuid primary key default uuid_generate_v4(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  description text not null,
  amount_cents integer not null,
  currency text not null,
  interval_type text not null,
  start_date date not null,
  end_date date null,
  next_due_date date null,
  created_at timestamp with time zone default now()
);

-- Enable RLS on recurrent_bills
alter table public.recurrent_bills enable row level security;

-- Recurrent bills RLS policies (wallet-based access via user_wallets, same as bills)
create policy "recurrent_bill_select" on recurrent_bills
for select to authenticated
using (
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and recurrent_bills.wallet_id = wallets.id
  )
);

create policy "recurrent_bill_insert" on recurrent_bills
for insert to authenticated with check (
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and recurrent_bills.wallet_id = wallets.id
    and user_wallets.role = 'editor'
  )
);

create policy "recurrent_bill_update" on recurrent_bills
for update to authenticated using (
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and recurrent_bills.wallet_id = wallets.id
    and user_wallets.role = 'editor'
  )
) with check (true);

create policy "recurrent_bill_delete" on recurrent_bills
for delete to authenticated using (
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and recurrent_bills.wallet_id = wallets.id
    and user_wallets.role = 'editor'
  )
);

-- Create indexes for performance
create index recurrent_bills_wallet_id_idx on recurrent_bills(wallet_id);
create index recurrent_bills_next_due_date_idx on recurrent_bills(next_due_date);
create index recurrent_bills_start_date_idx on recurrent_bills(start_date);
