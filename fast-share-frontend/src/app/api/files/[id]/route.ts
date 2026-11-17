import { handle, ok, requireClient, positiveInt, HttpError } from "@/server/api";
import { sql } from "@/server/db";
import { notifyRoom } from "@/server/realtime";
import { deleteUploaded } from "@/server/storage";

/** DELETE /api/files/:id — room owner/admin only. */
export const DELETE = handle<{ id: string }>(async (req, { id }) => {
  const client = await requireClient(req);
  const fileId = positiveInt(id);

  const [file] = await sql`
    select f.storage_key, rm.role, r.realtime_key
    from files f
    join rooms r on r.id = f.room_id
    left join room_members rm on rm.room_id = f.room_id and rm.client_id = ${client.id}
    where f.id = ${fileId}`;
  if (!file) throw new HttpError(404, "NOT_FOUND", "file not found");
  if (!file.role) throw new HttpError(403, "FORBIDDEN", "not a room member");
  if (file.role !== "owner" && file.role !== "admin") {
    throw new HttpError(403, "FORBIDDEN", "only owner or admin can delete file");
  }

  await sql`delete from files where id = ${fileId}`;
  await deleteUploaded([file.storage_key]);
  await notifyRoom(file.realtime_key, { event: "files", payload: {} });
  return ok(200, { status: "deleted", id: fileId });
});
