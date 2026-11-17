-- Private bucket for room files. Only the server (secret key) can access it;
-- browsers upload/download through short-lived signed URLs the API hands out.
-- 50 MB = Supabase free plan's max upload size.
insert into storage.buckets (id, name, public, file_size_limit)
values ('room-files', 'room-files', false, 52428800)
on conflict (id) do nothing;
