create table public.recurring_transactions (
  id uuid not null default uuid_generate_v4(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  category_id uuid not null references categories(id),
  label_id uuid references labels(id) on delete set null,
  description text null,
  amount_cents integer not null,
  currency text not null,
  interval_type text not null,
  start_date date not null,
  end_date date null,
  next_run_date date null,
  constraint recurring_transactions_pkey primary key (id)
) tablespace pg_default;