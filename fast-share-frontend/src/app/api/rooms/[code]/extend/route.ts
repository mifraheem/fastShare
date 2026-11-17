import {
  handle, ok, readJson, requireClient, now, HttpError, MIN_EXTEND_MINUTES, MAX_EXTEND_MINUTES,
} from "@/server/api";
import { sql } from "@/server/db";

/** POST /api/rooms/:code/extend — owner only. Body { minutes } or ?minutes= */
export const POST = handle<{ code: string }>(async (req, { code }) => {
  const client = await requireClient(req);
  const body = await readJson(req);
  const minutes =
    parseInt(req.nextUrl.searchParams.get("minutes") ?? String(body.minutes ?? ""), 10) || 0;
  if (minutes < MIN_EXTEND_MINUTES || minutes > MAX_EXTEND_MINUTES) {
    throw new HttpError(
      400, "BAD_REQUEST", `minutes must be between ${MIN_EXTEND_MINUTES} and ${MAX_EXTEND_MINUTES}`
    );
  }

  const [room] = await sql`
    select id, code, name, owner_client_id, expires_at from rooms where code = ${code.trim()}`;
  if (!room) throw new HttpError(404, "NOT_FOUND", "room not found");
  if (room.owner_client_id !== client.id) {
    throw new HttpError(403, "FORBIDDEN", "only owner can extend room");
  }
  const n = now();
  if (room.expires_at <= n) {
    throw new HttpError(410, "ROOM_EXPIRED", "room already expired; cannot extend");
  }

  const [updated] = await sql`
    update rooms set expires_at = expires_at + ${minutes * 60}, updated_at = ${n}
    where id = ${room.id}
    returning expires_at`;

  return ok(200, {
    status: "extended",
    code: room.code,
    name: room.name,
    old_expires: room.expires_at,
    expires_at: updated.expires_at,
    expires_in: updated.expires_at - n,
    added_minutes: minutes,
  });
});
