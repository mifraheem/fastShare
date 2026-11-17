# FastShare Frontend

Web UI for FastShare: create and join rooms, chat, and share files.  
Next.js (App Router) + React + Tailwind. Deployed on **Vercel**.

**Live:** [room.ifraheem.dev](https://room.ifraheem.dev)

## Requirements

- Node.js 18+
- npm

## Setup

```bash
cd fast-share-frontend
npm install
cp .env.example .env
# Set NEXT_PUBLIC_API_BASE_URL to your backend URL
npm run dev
```

Runs at **http://localhost:8081**.

## Environment

| Variable             | Description        | Example |
|----------------------|-------------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL   | `https://your-api.example.com` or `http://localhost:8000` |

## Tech stack

- **Next.js** — App Router, build and dev server  
- **React** — UI  
- **TypeScript** — types  
- **Tailwind CSS** — styling  
- **shadcn/ui** — components  
- **TanStack Query** — API state  


## Deploy (Vercel)

Connect the repo to Vercel (framework: Next.js) and set `NEXT_PUBLIC_API_BASE_URL` in project environment variables. Vercel detects the build settings automatically.

## License

MIT
