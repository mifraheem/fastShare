import { handle, ok } from "@/server/api";
import { sql } from "@/server/db";

export const GET = handle(async () => {
  await sql`select 1`;
  return ok(200, { message: "FastShare is running and the database is connected" });
});
