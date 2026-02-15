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
# Edit .env if needed (CORS allows all origins; rate limit is global)
npm start
```

Runs on **http://localhost:8000** by default.

## Environment

| Variable               | Description                              | Default |
|------------------------|------------------------------------------|---------|
| `PORT`                 | Server port                              | `8000`  |
| `DB_PATH`              | SQLite database path                     | `app.db`|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms)                   | `60000` (1 min) |
| `RATE_LIMIT_MAX`       | Max requests per IP per window           | `120`   |

CORS allows all origins. A global rate limiter applies to all routes except `GET /health`.

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

- **GET /health** — Liveness probe (returns 200 if the process is up; no DB check). Use this in Hostinger health-check if available.
- **GET /** — Full health (checks DB connection).

## 503 Service Unavailable on Hostinger

If the backend URL shows **503 Service Unavailable**, the reverse proxy cannot reach your Node app. Common causes:

1. **App not running or crashed**
   - In Hostinger: **Website → Node.js → Deployments**. Check the latest deployment status and **build/runtime logs** for errors.
   - Restart: use **Settings & Redeploy → Rebuild** (or restart the Node.js application if the panel has that option).

2. **Wrong start command**
   - Start command must be `node server.js` or `npm start`, and the **working directory** must be the folder that contains `server.js` and `package.json`.

3. **Port**
   - Set **PORT** in Hostinger’s environment variables (e.g. `8000`). The proxy must forward to this port. Check Hostinger’s Node.js docs for the port they expect (some use a fixed port like `10000`).

4. **Database init failure**
   - If the app crashes on startup due to SQLite (e.g. `app.db` path not writable), the process exits and the proxy returns 503. Check runtime logs. The server now catches DB init errors and still starts; you’ll see a log line like `Database init failed: ...`.

5. **Environment variables**
   - Add **CORS_ORIGINS**, **PORT**, **DB_PATH** in Hostinger’s **Environment variables** (not only in a local `.env`). After changing them, **redeploy** so the new values are applied.

After fixing, open **https://your-backend.ifraheem.dev/health** in a browser. If you get `{"ok":true,"status":"ok"}`, the process is up.

## License

MIT
