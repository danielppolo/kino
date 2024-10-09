create table
  public.labels (
    id uuid not null default uuid_generate_v4 (),
    name text not null,
    color text not null,
    user_id uuid not null default auth.uid (),
    constraint labels_pkey primary key (id),
    constraint labels_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
  ) tablespace pg_default;