create table
  public.wallets (
    id uuid not null default uuid_generate_v4 (),
    name text not null,
    currency text not null,
    owner_id uuid not null default auth.uid (),
    constraint wallets_pkey primary key (id),
    constraint wallets_owner_id_fkey foreign key (owner_id) references auth.users (id) on delete cascade
  ) tablespace pg_default;