import { handle, ok, requireClient, now, HttpError } from "@/server/api";
import { sql } from "@/server/db";
import { notifyRoom } from "@/server/realtime";
import { deleteRoomFolder } from "@/server/storage";

type Params = { code: string };

/** GET /api/rooms/:code — room detail with members (members only, works after expiry). */
export const GET = handle<Params>(async (req, { code }) => {
  const client = await requireClient(req);
  const [room] = await sql`
    select id, code, name, owner_client_id, expires_at, created_at, updated_at, realtime_key
    from rooms where code = ${code.trim()}`;
  if (!room) throw new HttpError(404, "NOT_FOUND", "room not found");

  const memberRows = await sql`
    select rm.client_id as id, rm.role, rm.joined_at, c.name
    from room_members rm
    left join clients c on c.id = rm.client_id
    where rm.room_id = ${room.id}
    order by rm.joined_at asc`;

  const members = memberRows.map((m) => ({
    id: m.id,
    name: m.name || "Member",
    role: m.role,
    joined_at: m.joined_at,
    me: m.id === client.id,
  }));
  if (!members.some((m) => m.me)) throw new HttpError(403, "FORBIDDEN", "not a room member");

  const n = now();
  return ok(200, {
    code: room.code,
    name: room.name,
    owner: room.owner_client_id === client.id,
    expires_at: room.expires_at,
    expires_in: Math.max(0, room.expires_at - n),
    expired: room.expires_at <= n,
    created_at: room.created_at,
    updated_at: room.updated_at,
    members,
    member_count: members.length,
    realtime_key: room.realtime_key, // members only: the 403 above runs first
  });
});

/** DELETE /api/rooms/:code — owner only. Removes messages, members, files and the stored files. */
export const DELETE = handle<Params>(async (req, { code }) => {
  const client = await requireClient(req);
  const [room] = await sql`select id, owner_client_id, realtime_key from rooms where code = ${code.trim()}`;
  if (!room) throw new HttpError(404, "NOT_FOUND", "room not found");
  if (room.owner_client_id !== client.id) {
    throw new HttpError(403, "FORBIDDEN", "only owner can delete room");
  }

  const filesDeleted = await deleteRoomFolder(code.trim());
  await sql`delete from rooms where id = ${room.id}`;
  await notifyRoom(room.realtime_key, { event: "room", payload: { op: "delete" } });

  return ok(200, { status: "deleted", code: code.trim(), files_deleted: filesDeleted });
});
