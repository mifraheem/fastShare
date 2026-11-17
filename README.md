# FastShare

Private rooms for real-time chat and file sharing. Create a room, share the code, and collaborate with your team.

**Live app:** [room.ifraheem.dev](https://room.ifraheem.dev)

| Part         | Stack                                   | Hosting    |
|--------------|-----------------------------------------|------------|
| **App + API** | Next.js (App Router + Route Handlers), React, Tailwind | Vercel |
| **Database** | Postgres                                | Supabase   |
| **Files**    | Supabase Storage (private bucket)       | Supabase   |

## Repo structure

```
fast-share/
  fast-share-frontend/          # The whole app (Next.js)
    src/app/                    # Pages + API routes (src/app/api)
    src/server/                 # Server-only: DB, storage, API helpers
    supabase/migrations/        # Database schema
```

See [fast-share-frontend/README.md](fast-share-frontend/README.md) for setup and run instructions.

## Contributing

Contributions are welcome. Please open an issue to discuss larger changes, or send a pull request for small fixes and features.

1. Fork the repo  
2. Create a branch (`git checkout -b feature/your-feature`)  
3. Commit your changes (`git commit -m 'Add some feature'`)  
4. Push to the branch (`git push origin feature/your-feature`)  
5. Open a Pull Request  

## License

[MIT](LICENSE)
