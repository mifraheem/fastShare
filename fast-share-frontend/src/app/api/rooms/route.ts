import {
  handle, ok, readJson, requireClient, now, isUniqueViolation,
  generateCode, generateRoomName, ROOM_TTL_SECONDS, MAX_ROOM_NAME_LENGTH,
} from "@/server/api";
import { sql } from "@/server/db";

/** POST /api/rooms — create a room (optional body: { name }). Creator joins as owner. */
export const POST = handle(async (req) => {
  const client = await requireClient(req);
  const body = await readJson(req);
  const custom = typeof body.name === "string" ? body.name.trim().slice(0, MAX_ROOM_NAME_LENGTH) : "";
  const name = custom || generateRoomName();
  const n = now();
  const expiresAt = n + ROOM_TTL_SECONDS;

  // Retry on the (rare) room code collision
  for (let attempt = 0; ; attempt++) {
    const code = generateCode();
    try {
      await sql`
        with room as (
          insert into rooms (code, name, owner_client_id, expires_at, created_at, updated_at)
          values (${code}, ${name}, ${client.id}, ${expiresAt}, ${n}, ${n})
          returning id
        )
        insert into room_members (room_id, client_id, role, joined_at)
        select id, ${client.id}, 'owner', ${n} from room`;

      return ok(201, {
        code,
        name,
        owner: true,
        expires_at: expiresAt,
        expires_in: expiresAt - n,
        created_at: n,
        updated_at: n,
        owner_client_id: client.id,
      });
    } catch (err) {
      if (isUniqueViolation(err) && attempt < 4) continue;
      throw err;
    }
  }
});
