import {
  handle, ok, readJson, requireClient, requireMembership, now, HttpError, isUniqueViolation, safeFilename,
} from "@/server/api";
import { sql } from "@/server/db";
import { getUploaded } from "@/server/storage";

type Params = { code: string };

/** GET /api/rooms/:code/files — newest first. url opens the file via the download route. */
export const GET = handle<Params>(async (req, { code }) => {
  const client = await requireClient(req);
  const room = await requireMembership(code.trim(), client.id);

  const rows = await sql`
    select id, filename, size, downloaded, created_at
    from files where room_id = ${room.id}
    order by id desc`;

  const files = rows.map((f) => ({
    id: f.id,
    filename: f.filename,
    size: f.size,
    downloaded: f.downloaded,
    created_at: f.created_at,
    url: `/api/files/${f.id}/download`,
  }));
  return ok(200, { files });
});

/**
 * POST /api/rooms/:code/files — step 2 of an upload (see upload-url).
 * Body: { key, filename }. Confirms the file exists in storage and records it.
 */
export const POST = handle<Params>(async (req, { code }) => {
  const client = await requireClient(req);
  const body = await readJson(req);
  const room = await requireMembership(code.trim(), client.id);

  // Key must be one we issued for this room: rooms/<code>/<uuid>
  const key = String(body.key ?? "");
  const parts = key.split("/");
  if (
    parts.length !== 3 || parts[0] !== "rooms" || parts[1] !== room.code ||
    !/^[0-9a-f-]{36}$/.test(parts[2])
  ) {
    throw new HttpError(400, "BAD_REQUEST", "invalid upload key");
  }

  const object = await getUploaded(key);
  if (!object) throw new HttpError(400, "BAD_REQUEST", "file was not uploaded");

  const filename = safeFilename(body.filename);
  const n = now();
  try {
    const [file] = await sql`
      insert into files (room_id, uploader_client_id, filename, storage_key, size, created_at)
      values (${room.id}, ${client.id}, ${filename}, ${key}, ${object.size}, ${n})
      returning id`;
    return ok(201, { id: file.id, filename, size: object.size, uploaded_at: n });
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, "CONFLICT", "file already recorded");
    throw err;
  }
});
