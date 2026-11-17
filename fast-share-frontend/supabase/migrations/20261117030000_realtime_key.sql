-- Per-room secret for the Supabase Realtime channel name (room:<realtime_key>).
-- Only room members receive it (GET /api/rooms/:code), so knowing the 6-char room
-- code is not enough to listen. Channels carry change signals, not message content.
alter table rooms
  add column realtime_key uuid not null default gen_random_uuid();
