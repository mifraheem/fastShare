import { NextResponse } from "next/server";
import { handle, requireClient, positiveInt, now, HttpError } from "@/server/api";
import { sql } from "@/server/db";
import { signedDownloadUrl } from "@/server/storage";

/**
 * GET /api/files/:id/download[?download=1] — members only.
 * Identity comes from the header or the X-Client-UUID cookie, so plain links work.
 * Redirects to a 5-minute signed storage URL; download=1 saves it under its name, otherwise the browser may show it inline.
 */
export const GET = handle<{ id: string }>(async (req, { id }) => {
  const client = await requireClient(req, true);
  const fileId = positiveInt(id);

  const [file] = await sql`
    select f.filename, f.storage_key, r.expires_at
    from files f
    join rooms r on r.id = f.room_id
    join room_members rm on rm.room_id = r.id and rm.client_id = ${client.id}
    where f.id = ${fileId}`;
  if (!file) throw new HttpError(404, "NOT_FOUND", "file not found or no access");
  if (file.expires_at <= now()) throw new HttpError(410, "ROOM_EXPIRED", "room expired");

  await sql`update files set downloaded = downloaded + 1 where id = ${fileId}`;

  const attachment = req.nextUrl.searchParams.get("download") === "1";
  const url = await signedDownloadUrl(file.storage_key, attachment ? file.filename : undefined);
  return NextResponse.redirect(url, 302);
});
