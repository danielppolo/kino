create table public.tags (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  "group" text null,
  user_id uuid not null default auth.uid(),
  created_at timestamp with time zone default now()
);

alter table public.tags
  add constraint tags_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
