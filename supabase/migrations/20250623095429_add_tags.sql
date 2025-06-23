create table public.tags (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  "group" text null,
  user_id uuid not null default auth.uid(),
  created_at timestamp with time zone default now()
);

alter table public.tags
  add constraint tags_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

create policy "tags_policy"
    on tags
    for select using ( (select auth.uid()) = user_id );
create policy "tags_insert_policy"
    on tags
    for insert
    to authenticated
    with check (true);
create policy "tags_update_policy"
    on tags
    for update
    to authenticated
    using ( (select auth.uid()) = user_id )
    with check ( (select auth.uid()) = user_id );
create policy "tags_delete_policy"
    on tags
    for delete using ( (select auth.uid()) = user_id );

