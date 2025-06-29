create table public.views (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  query_params text not null,
  user_id uuid not null default auth.uid()
);

alter table public.views
  add constraint views_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.views enable row level security;

create policy "views_policy"
    on views
    for select using ( (select auth.uid()) = user_id );
create policy "views_insert_policy"
    on views
    for insert
    to authenticated
    with check (true);
create policy "views_update_policy"
    on views
    for update
    to authenticated
    using ( (select auth.uid()) = user_id )
    with check ( (select auth.uid()) = user_id );
create policy "views_delete_policy"
    on views
    for delete using ( (select auth.uid()) = user_id );
