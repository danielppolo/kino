drop table if exists public.plaid_transaction_rules cascade;
drop function if exists public.set_plaid_transaction_rules_updated_at();

create table public.transaction_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  enabled boolean not null default true,
  priority integer not null default 0 check (priority >= 0),
  trigger_source text not null default 'plaid'
    check (trigger_source in ('plaid')),
  match_mode text not null default 'all'
    check (match_mode in ('all', 'any')),
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '{}'::jsonb,
  stop_processing boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index transaction_rules_workspace_priority_idx
  on public.transaction_rules (workspace_id, priority, created_at);

create table public.transaction_rule_applications (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.transaction_rules(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  applied_actions jsonb not null default '{}'::jsonb,
  execution_mode text not null default 'live'
    check (execution_mode in ('live', 'backfill')),
  applied_at timestamptz not null default timezone('utc', now())
);

create unique index transaction_rule_applications_rule_transaction_mode_key
  on public.transaction_rule_applications (rule_id, transaction_id, execution_mode);
create index transaction_rule_applications_rule_applied_at_idx
  on public.transaction_rule_applications (rule_id, applied_at desc);

create or replace function public.set_transaction_rules_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger transaction_rules_set_updated_at
before update on public.transaction_rules
for each row execute function public.set_transaction_rules_updated_at();

alter table public.transaction_rules enable row level security;
alter table public.transaction_rule_applications enable row level security;

create policy "transaction_rules_select" on public.transaction_rules
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "transaction_rules_insert" on public.transaction_rules
for insert to authenticated
with check (
  public.has_workspace_role(workspace_id, array['owner', 'editor'])
);

create policy "transaction_rules_update" on public.transaction_rules
for update to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'editor']))
with check (public.has_workspace_role(workspace_id, array['owner', 'editor']));

create policy "transaction_rules_delete" on public.transaction_rules
for delete to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'editor']));

create policy "transaction_rule_applications_select"
on public.transaction_rule_applications
for select to authenticated
using (
  exists (
    select 1
    from public.transaction_rules
    where transaction_rules.id = transaction_rule_applications.rule_id
      and public.is_workspace_member(transaction_rules.workspace_id)
  )
);

create policy "transaction_rule_applications_insert"
on public.transaction_rule_applications
for insert to authenticated
with check (
  exists (
    select 1
    from public.transaction_rules
    where transaction_rules.id = transaction_rule_applications.rule_id
      and public.has_workspace_role(
        transaction_rules.workspace_id,
        array['owner', 'editor']
      )
  )
);

create policy "transaction_rule_applications_update"
on public.transaction_rule_applications
for update to authenticated
using (
  exists (
    select 1
    from public.transaction_rules
    where transaction_rules.id = transaction_rule_applications.rule_id
      and public.has_workspace_role(
        transaction_rules.workspace_id,
        array['owner', 'editor']
      )
  )
)
with check (
  exists (
    select 1
    from public.transaction_rules
    where transaction_rules.id = transaction_rule_applications.rule_id
      and public.has_workspace_role(
        transaction_rules.workspace_id,
        array['owner', 'editor']
      )
  )
);
