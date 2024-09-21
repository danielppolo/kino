-- Enable RLS for subjects table
alter table subjects enable row level security;
-- Create policy to allow users to access their own subjects
create policy "subjects_policy" 
    on subjects 
    for select using ( (select auth.uid()) = user_id );
create policy "subjects_insert_policy" 
    on subjects 
    for insert
    to authenticated
    with check ( (select auth.uid()) = user_id );
create policy "subjects_update_policy"
    on subjects
    for update
    to authenticated
    using ( (select auth.uid()) = user_id )
    with check ( (select auth.uid()) = user_id );
create policy "subjects_delete_policy"
    on subjects
    for delete using ( (select auth.uid()) = user_id );
