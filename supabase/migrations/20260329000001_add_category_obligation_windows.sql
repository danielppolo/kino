alter table public.categories
add column if not exists required_spend_kind text not null default 'none',
add column if not exists obligation_start_date date,
add column if not exists obligation_end_date date;

update public.categories
set required_spend_kind = case
  when is_obligation then 'atemporal'
  else 'none'
end
where required_spend_kind = 'none';

alter table public.categories
drop constraint if exists categories_obligation_window_check;

alter table public.categories
add constraint categories_obligation_window_check
check (
  (
    required_spend_kind = 'none'
    and obligation_start_date is null
    and obligation_end_date is null
  )
  or (
    required_spend_kind = 'atemporal'
    and obligation_start_date is null
    and obligation_end_date is null
  )
  or (
    required_spend_kind = 'temporal'
    and obligation_start_date is not null
    and (
      obligation_end_date is null
      or obligation_end_date >= obligation_start_date
    )
  )
);

alter table public.categories
drop column if exists is_obligation;
