# FastShare Frontend

Web UI for FastShare: create and join rooms, chat, and share files.  
React + Vite + Tailwind. Deployed on **Vercel**.

**Live:** [room.ifraheem.dev](https://room.ifraheem.dev)

## Requirements

- Node.js 18+
- npm

## Setup

```bash
cd fast-share-frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL to your backend URL
npm run dev
```

Runs at **http://localhost:5173** (Vite).

## Environment

| Variable             | Description        | Example |
|----------------------|-------------------|---------|
| `VITE_API_BASE_URL`  | Backend API URL   | `https://your-api.example.com` or `http://localhost:8000` |

## Tech stack

- **Vite** — build and dev server  
- **React** — UI  
- **TypeScript** — types  
- **Tailwind CSS** — styling  
- **shadcn/ui** — components  
- **TanStack Query** — API state  
- **React Router** — routing  

## Deploy (Vercel)

Connect the repo to Vercel and set `VITE_API_BASE_URL` in project environment variables. Build command: `npm run build`. Output: `dist`.

## License

MIT
