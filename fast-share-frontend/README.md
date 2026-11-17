# FastShare

Private, temporary rooms for chat and file sharing: create and join rooms, chat, and share files.
One Next.js app (pages + API routes) on **Vercel**, with **Supabase** for the database (Postgres)
and file storage.

**Live:** [room.ifraheem.dev](https://room.ifraheem.dev)

## Requirements

- Node.js 20.9+
- A Supabase project (free plan is fine)

## Setup

```bash
cd fast-share-frontend
npm install
cp .env.example .env   # fill in the values below
npm run dev            # http://localhost:8081
```

### Supabase

1. Create a project, then apply the migrations in [`supabase/migrations`](supabase/migrations)
   (`npx supabase link --project-ref <ref>` then `npx supabase db push --remote`, or paste them
   into the SQL Editor in order). They create the tables and a private `room-files` bucket
   (50 MB per file).
2. **Connect → Transaction pooler** → copy the URI (port `6543`) into `DATABASE_URL`.
3. **Project Settings → API Keys** → copy the project URL into `SUPABASE_URL` and the
   `service_role` key into `SUPABASE_SECRET_KEY`. (The newer `sb_secret_…` keys were rejected
   by Storage on this project, so use `service_role`.)

Row-level security is on with no policies and the bucket is private: only the server can read
or write. Supabase's public anon key has no access.

## Environment

| Variable              | Description |
|-----------------------|-------------|
| `DATABASE_URL`        | Supabase transaction pooler URI (port 6543) |
| `SUPABASE_URL`        | `https://<project-ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | `service_role` key (server-only) |
| `CRON_SECRET`         | Any long random string; protects the cleanup job |

All are server-only (never sent to the browser).

## Files

- Browsers upload straight to Supabase Storage with a signed URL (Vercel caps request bodies
  at 4.5 MB, so files never pass through the API). Max 50 MB per file (Supabase free plan).
- Downloads go through `/api/files/:id/download`, which checks room membership and redirects to
  a 5-minute signed URL.
- A daily Vercel Cron job (`/api/cron/cleanup`, see `vercel.json`) deletes rooms that expired
  over an hour ago, with their files, messages and members. This keeps storage within the free
  plan's 1 GB.

## API

Every request sends `X-Client-UUID` (anonymous browser identity, kept in a cookie).
Responses are `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.

| Route | |
|---|---|
| `GET /api/health` | DB check |
| `PUT /api/me` | Set display name |
| `POST /api/rooms` · `GET /api/rooms/joined` | Create room · list joined rooms |
| `GET` · `DELETE /api/rooms/:code` | Room detail + members · delete (owner) |
| `POST /api/rooms/:code/join` · `/extend` | Join · extend expiry (owner) |
| `GET` · `POST /api/rooms/:code/messages` | List (`?after=&limit=`) · send (plain-text body) |
| `PUT` · `DELETE /api/messages/:id` | Edit own · delete (sender or owner) |
| `POST /api/rooms/:code/files/upload-url` | Signed upload URL (max 50 MB) |
| `GET` · `POST /api/rooms/:code/files` | List · record an uploaded file `{ key, filename }` |
| `GET /api/files/:id/download` | Redirect to a short-lived URL (`?download=1` to save) |
| `DELETE /api/files/:id` | Delete (owner/admin) |
| `GET /api/cron/cleanup` | Daily cleanup (Vercel Cron, needs `CRON_SECRET`) |

Check every endpoint against a running server (creates and cleans up its own room):

```bash
node scripts/api-smoke.mjs                      # local
node scripts/api-smoke.mjs https://your-app.vercel.app
```

## Deploy (Vercel)

Import the repo, set **Root Directory** to `fast-share-frontend`, and add the environment
variables above. Functions run in Singapore (`sin1`, next to the database) and the cleanup cron
is registered from `vercel.json`.

## License

MIT
