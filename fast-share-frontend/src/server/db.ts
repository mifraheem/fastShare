import postgres from "postgres";

/**
 * Postgres (Supabase) connection.
 * DATABASE_URL should be Supabase's transaction pooler URL (port 6543) on Vercel.
 * prepare: false is required for transaction-mode pooling.
 */
function connect() {
  return postgres(process.env.DATABASE_URL ?? "", {
    prepare: false,
    max: 5,
    // Supabase's transaction pooler (Supavisor) can hang on pipelined queries:
    // send one query per connection at a time (see postgres.js README, "Supavisor").
    max_pipeline: 1,
    // Backstops so a silent pooler can never hang requests forever
    query_timeout: 15,
    connect_timeout: 10,
    idle_timeout: 20,
    types: {
      // Return int8 (ids, unix timestamps) as JS numbers instead of strings
      bigint: {
        to: 20,
        from: [20],
        serialize: (x: number) => String(x),
        parse: (x: string) => Number(x),
      },
    },
  });
}

// Reuse one pool across dev hot reloads
const g = globalThis as unknown as { __sql?: ReturnType<typeof connect> };
export const sql = g.__sql ?? (g.__sql = connect());
