import { NextRequest } from "next/server";
import { handle, ok, now, HttpError } from "@/server/api";
import { sql } from "@/server/db";
import { deleteRoomFolder } from "@/server/storage";

/**
 * GET /api/cron/cleanup — run daily by Vercel Cron (see vercel.json).
 * Deletes rooms that expired over an hour ago: their stored files (including abandoned
 * uploads) and, via ON DELETE CASCADE, their members, messages and file rows.
 * Vercel sends "Authorization: Bearer $CRON_SECRET"; without CRON_SECRET set it refuses to run.
 */
export const GET = handle(async (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new HttpError(401, "UNAUTHORIZED", "unauthorized");
  }

  // ponytail: 200 rooms per run; a daily run keeps up unless >200 rooms expire per day
  const rooms = await sql`
    select id, code from rooms where expires_at < ${now() - 3600}
    order by expires_at limit 200`;

  let files = 0;
  for (const room of rooms) {
    files += await deleteRoomFolder(room.code);
    await sql`delete from rooms where id = ${room.id}`;
  }
  return ok(200, { rooms_deleted: rooms.length, files_deleted: files });
});
