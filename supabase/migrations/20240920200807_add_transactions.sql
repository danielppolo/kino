create table
  public.transactions (
    id uuid not null default uuid_generate_v4 (),
    created_at timestamp with time zone null default now(),
    description text null,
    label_id uuid null,
    category_id uuid not null,
    tags text[] null,
    amount_cents integer not null,
    wallet_id uuid not null,
    date date not null,
    note text null,
    currency text not null,
    constraint transactions_pkey primary key (id),
    constraint transactions_label_id_fkey foreign key (label_id) references labels (id) on delete set null,
    constraint transactions_category_id_fkey foreign key (category_id) references categories (id),
    constraint transactions_wallet_id_fkey foreign key (wallet_id) references wallets (id)
  ) tablespace pg_default;