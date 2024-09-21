create table
  public.subjects (
    id uuid not null default uuid_generate_v4 (),
    name text not null,
    icon text not null,
    type text null,
    user_id uuid null,
    constraint subjects_pkey primary key (id),
    constraint subjects_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
    constraint subjects_type_check check (
      (
        type = any (array['income'::text, 'expense'::text])
      )
    )
  ) tablespace pg_default;