import { handle, ok, requireClient, now } from "@/server/api";
import { sql } from "@/server/db";

/** GET /api/rooms/joined?include_expired=true — rooms the caller is a member of. */
export const GET = handle(async (req) => {
  const client = await requireClient(req);
  const flag = req.nextUrl.searchParams.get("include_expired");
  const includeExpired = flag === "true" || flag === "1";
  const n = now();

  const rows = await sql`
    select r.code, r.name, r.owner_client_id, r.expires_at, r.created_at, r.updated_at,
           rm.role, rm.joined_at
    from room_members rm
    join rooms r on r.id = rm.room_id
    where rm.client_id = ${client.id}
      ${includeExpired ? sql`` : sql`and r.expires_at > ${n}`}
    order by r.updated_at desc`;

  const rooms = rows.map((r) => ({
    code: r.code,
    name: r.name,
    role: r.role,
    joined_at: r.joined_at,
    owner: r.owner_client_id === client.id,
    expires_at: r.expires_at,
    expires_in: Math.max(0, r.expires_at - n),
    created_at: r.created_at,
    updated_at: r.updated_at,
    expired: r.expires_at <= n,
  }));
  return ok(200, { rooms });
});
