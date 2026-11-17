-- FastShare schema (ported from the SQLite backend).
-- Timestamps are unix seconds (bigint) to keep the API contract unchanged.

create table clients (
  id         bigint generated always as identity primary key,
  uuid       text not null unique,
  name       text not null default '',
  expires_at bigint not null,
  created_at bigint not null
);

create table rooms (
  id              bigint generated always as identity primary key,
  code            text not null unique,
  name            text not null,
  owner_client_id bigint not null references clients (id),
  expires_at      bigint not null,
  created_at      bigint not null,
  updated_at      bigint not null
);
create index rooms_owner_idx on rooms (owner_client_id);

create table room_members (
  id        bigint generated always as identity primary key,
  room_id   bigint not null references rooms (id) on delete cascade,
  client_id bigint not null references clients (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at bigint not null,
  unique (room_id, client_id)
);
create index room_members_client_idx on room_members (client_id);

create table messages (
  id               bigint generated always as identity primary key,
  room_id          bigint not null references rooms (id) on delete cascade,
  sender_client_id bigint not null references clients (id),
  content          text not null,
  created_at       bigint not null
);
create index messages_room_id_idx on messages (room_id, id);

create table files (
  id                 bigint generated always as identity primary key,
  room_id            bigint not null references rooms (id) on delete cascade,
  uploader_client_id bigint not null references clients (id),
  filename           text not null,
  storage_key        text not null unique, -- R2 object key
  content_type       text not null default 'application/octet-stream',
  size               bigint not null default 0,
  downloaded         integer not null default 0,
  created_at         bigint not null
);
create index files_room_idx on files (room_id);

-- All access goes through the Next.js API (server-side connection).
-- RLS on with no policies = Supabase's public anon/authenticated keys can't read or write.
alter table clients      enable row level security;
alter table rooms        enable row level security;
alter table room_members enable row level security;
alter table messages     enable row level security;
alter table files        enable row level security;
