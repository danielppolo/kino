-- Add unique constraint on title column per user
alter table public.tags
  add constraint tags_title_user_id_unique unique (title, user_id);
