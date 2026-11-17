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
