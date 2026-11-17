import { handle, ok, requireClient, now, HttpError } from "@/server/api";
import { sql } from "@/server/db";
import { notifyRoom } from "@/server/realtime";

/** POST /api/rooms/:code/join */
export const POST = handle<{ code: string }>(async (req, { code }) => {
  const client = await requireClient(req);
  const [room] = await sql`select id, code, name, expires_at, realtime_key from rooms where code = ${code.trim()}`;
  if (!room) throw new HttpError(404, "NOT_FOUND", "room not found");

  const n = now();
  if (room.expires_at <= n) throw new HttpError(410, "ROOM_EXPIRED", "room expired");

  await sql`
    insert into room_members (room_id, client_id, role, joined_at)
    values (${room.id}, ${client.id}, 'member', ${n})
    on conflict (room_id, client_id) do nothing`;
  await sql`update rooms set updated_at = ${n} where id = ${room.id}`;
  await notifyRoom(room.realtime_key, { event: "room", payload: { op: "join" } });

  return ok(200, {
    status: "joined",
    code: room.code,
    name: room.name,
    expires_at: room.expires_at,
    expires_in: room.expires_at - n,
  });
});
