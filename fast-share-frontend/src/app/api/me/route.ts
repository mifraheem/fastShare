import { handle, ok, readJson, requireClient, HttpError, MAX_NAME_LENGTH } from "@/server/api";
import { sql } from "@/server/db";

/** PUT /api/me — set display name. Body: { name } */
export const PUT = handle(async (req) => {
  const client = await requireClient(req);
  const body = await readJson(req);
  const name = String(body.name ?? "").trim().slice(0, MAX_NAME_LENGTH);
  if (!name) throw new HttpError(400, "BAD_REQUEST", "name is required");

  await sql`update clients set name = ${name} where id = ${client.id}`;
  return ok(200, { name });
});
