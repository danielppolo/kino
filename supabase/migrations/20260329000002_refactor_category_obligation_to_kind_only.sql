alter table public.categories
drop constraint if exists categories_obligation_window_check;

alter table public.categories
drop column if exists obligation_start_date,
drop column if exists obligation_end_date;

alter table public.categories
drop constraint if exists categories_obligation_kind_check;

alter table public.categories
add constraint categories_required_spend_kind_check
check (required_spend_kind in ('none', 'atemporal', 'temporal'));
