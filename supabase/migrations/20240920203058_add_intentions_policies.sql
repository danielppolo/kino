-- Enable RLS for intentions table
alter table intentions enable row level security;
-- Create policy to allow users to access their own intentions
create policy "intentions_policy" 
    on intentions 
    for select using ( (select auth.uid()) = user_id );
create policy "intentions_insert_policy" 
    on intentions 
    for insert
    to authenticated
    with check ( (select auth.uid()) = user_id );
create policy "intentions_update_policy"
    on intentions
    for update
    to authenticated
    using ( (select auth.uid()) = user_id )
    with check ( (select auth.uid()) = user_id );
create policy "intentions_delete_policy"
    on intentions
    for delete using ( (select auth.uid()) = user_id );
