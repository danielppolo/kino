create table
  public.wallets (
    id uuid not null default uuid_generate_v4 (),
    name text not null,
    currency text not null,
    constraint wallets_pkey primary key (id)
  ) tablespace pg_default;