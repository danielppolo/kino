create table
  public.wallets (
    id uuid not null default uuid_generate_v4 (),
    name text not null,
    currency text not null,
    user_id uuid null,
    constraint wallets_pkey primary key (id),
    constraint wallets_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
  ) tablespace pg_default;