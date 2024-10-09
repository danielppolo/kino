create table
  public.categories (
    id uuid not null default uuid_generate_v4 (),
    name text not null,
    icon text not null,
    type text not null,
    user_id uuid not null default auth.uid (),
    constraint categories_pkey primary key (id),
    constraint categories_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
    constraint categories_type_check check (
      (
        type = any (array['income'::text, 'expense'::text])
      )
    )
  ) tablespace pg_default;