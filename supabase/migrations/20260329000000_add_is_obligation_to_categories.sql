alter table public.categories
add column if not exists is_obligation boolean not null default false;
