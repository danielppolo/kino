-- Create bills table
create table public.bills (
  id uuid primary key default uuid_generate_v4(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  description text not null,
  amount_cents integer not null,
  currency text not null,
  due_date date not null,
  created_at timestamp with time zone default now()
);

-- Create bill_payments junction table
create table public.bill_payments (
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid not null references bills(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(bill_id, transaction_id)
);

-- Enable RLS on bills
alter table public.bills enable row level security;

-- Bills RLS policies (wallet-based access via user_wallets, same as transactions)
create policy "bill_select" on bills
for select to authenticated
using (
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and bills.wallet_id = wallets.id
  )
);

create policy "bill_insert" on bills
for insert to authenticated with check (
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and bills.wallet_id = wallets.id
    and user_wallets.role = 'editor'
  )
);

create policy "bill_update" on bills
for update to authenticated using (
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and bills.wallet_id = wallets.id
    and user_wallets.role = 'editor'
  )
) with check (true);

create policy "bill_delete" on bills
for delete to authenticated using (
  exists (
    select 1 from wallets
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and bills.wallet_id = wallets.id
    and user_wallets.role = 'editor'
  )
);

-- Enable RLS on bill_payments
alter table public.bill_payments enable row level security;

-- Bill payments RLS policies (access via bill's wallet)
create policy "bill_payment_select" on bill_payments
for select to authenticated
using (
  exists (
    select 1 from bills
    join wallets on bills.wallet_id = wallets.id
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and bill_payments.bill_id = bills.id
  )
);

create policy "bill_payment_insert" on bill_payments
for insert to authenticated with check (
  exists (
    select 1 from bills
    join wallets on bills.wallet_id = wallets.id
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and bill_payments.bill_id = bills.id
    and user_wallets.role = 'editor'
  )
);

create policy "bill_payment_delete" on bill_payments
for delete to authenticated using (
  exists (
    select 1 from bills
    join wallets on bills.wallet_id = wallets.id
    join user_wallets on wallets.id = user_wallets.wallet_id
    where user_wallets.user_id = auth.uid()
    and bill_payments.bill_id = bills.id
    and user_wallets.role = 'editor'
  )
);

-- Create indexes for performance
create index bills_wallet_id_idx on bills(wallet_id);
create index bills_due_date_idx on bills(due_date);
create index bill_payments_bill_id_idx on bill_payments(bill_id);
create index bill_payments_transaction_id_idx on bill_payments(transaction_id);

