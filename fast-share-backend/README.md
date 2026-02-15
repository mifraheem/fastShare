# FastShare Backend

Node.js + Express API for FastShare. Private rooms, chat messages, and file sharing.  
Pure JavaScript (no TypeScript). Deployed on **Hostinger**.

## Requirements

- Node.js 18+
- npm

## Setup

```bash
cd fast-share-backend
npm install
cp .env.example .env
# Edit .env: set CORS_ORIGINS to your frontend URL(s)
npm start
```

Runs on **http://localhost:8000** by default.

## Environment

| Variable       | Description                          | Example |
|----------------|--------------------------------------|---------|
| `PORT`         | Server port                          | `8000`  |
| `DB_PATH`      | SQLite database path                 | `app.db`|
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) | `https://room.ifraheem.dev` |

## Project structure

```
config/       # Port, DB, CORS, TTLs
db/           # SQLite connection and migrations
utils/        # Room code and name generation
storage/      # File storage helpers
middleware/   # Client identity (X-Client-UUID)
helpers/      # Response helpers (ok, fail)
handlers/     # me, rooms, messages, files
routes/       # Express routes
```

## API overview

- **PUT /me** — Set display name  
- **POST /rooms** — Create room (optional custom name)  
- **POST /rooms/:code/join** — Join room  
- **GET /rooms/joined** — List joined rooms  
- **GET /rooms/:code** — Room detail + members  
- **DELETE /rooms/:code** — Delete room (owner)  
- **POST /rooms/:code/extend** — Extend room (owner)  
- **POST|GET /rooms/:code/messages** — Send / list messages  
- **PUT|DELETE /messages/:id** — Update / delete message  
- **GET|POST /rooms/:code/files** — List / upload files  
- **GET /files/:id/download** — Download file  
- **DELETE /files/:id** — Delete file (owner/admin)  

All endpoints that need identity use the **X-Client-UUID** header.

## License

MIT
