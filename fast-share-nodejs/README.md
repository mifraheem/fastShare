# FastShare Backend (Node.js + Express)

Backend for **FastShare** — private rooms for real-time chat and file sharing.  
Pure Node.js and Express (no TypeScript). Easy to read and extend.

## Requirements

- Node.js 18+
- npm

## Install

```bash
cd fast-share-nodejs
npm install
```

## Run

```bash
npm start
```

Server runs on **http://localhost:8000** by default.

## Environment

Copy `.env.example` to `.env` and set your values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8000` |
| `DB_PATH` | SQLite database path | `app.db` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins (must match your UI URL exactly) | See `.env.example` |

CORS reads from `CORS_ORIGINS` in `.env`. Add every origin your frontend runs on (e.g. Vite dev server, production URL).

## Project structure

```
fast-share-nodejs/
  server.js           # Entry point
  config/            # App config (port, DB, CORS, TTLs)
  db/                 # SQLite connection and migrations
  utils/              # Helpers (room code, room name generation)
  storage/            # File storage helpers (mkdir, unique filename)
  middleware/        # Client identity (X-Client-UUID, get/create)
  helpers/            # API response helpers (ok, fail)
  handlers/           # Route handlers (me, rooms, messages, files)
  routes/             # Express route registration
```

## API (same as Go backend)

- **PUT /me** — Set display name (body: `{ "name": "..." }`, max 15 chars)
- **POST /rooms** — Create room (optional body: `{ "name": "..." }`)
- **POST /rooms/:code/join** — Join room
- **GET /rooms/joined** — List rooms you joined
- **GET /rooms/:code** — Room detail + members
- **DELETE /rooms/:code** — Delete room (owner only)
- **POST /rooms/:code/extend** — Extend room (owner only, body: `{ "minutes": 15 }`)
- **POST /rooms/:code/messages** — Send message (body: plain text)
- **GET /rooms/:code/messages** — Get messages (?after=&limit=)
- **PUT /messages/:id** — Update own message (body: plain text)
- **DELETE /messages/:id** — Delete message (sender or owner/admin)
- **GET /rooms/:code/files** — List files
- **POST /rooms/:code/files** — Upload file (multipart, field: `file`)
- **GET /files/:id/download** — Download file
- **DELETE /files/:id** — Delete file (owner/admin only)

All relevant endpoints require header **X-Client-UUID** (browser identity).

## License

MIT
