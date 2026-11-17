import {
  handle, ok, requireClient, positiveInt, HttpError, MAX_MESSAGE_LENGTH,
} from "@/server/api";
import { sql } from "@/server/db";
import { notifyRoom } from "@/server/realtime";

type Params = { id: string };

/** PUT /api/messages/:id — edit own message. Body: plain text. */
export const PUT = handle<Params>(async (req, { id }) => {
  const client = await requireClient(req);
  const msgId = positiveInt(id);
  const content = (await req.text()).trim();
  if (!content) throw new HttpError(400, "BAD_REQUEST", "empty message body");
  if (content.length > MAX_MESSAGE_LENGTH) throw new HttpError(413, "TOO_LARGE", "message too long");

  const updated = await sql`
    update messages m set content = ${content}
    from rooms r
    where m.id = ${msgId} and m.sender_client_id = ${client.id} and r.id = m.room_id
    returning m.id, r.realtime_key`;
  if (updated.length === 0) {
    throw new HttpError(403, "FORBIDDEN", "not message owner or message not found");
  }
  await notifyRoom(updated[0].realtime_key, { event: "messages", payload: { op: "update", id: msgId } });
  return ok(200, { id: msgId, status: "updated" });
});

/** DELETE /api/messages/:id — sender, or the room's owner/admin. */
export const DELETE = handle<Params>(async (req, { id }) => {
  const client = await requireClient(req);
  const msgId = positiveInt(id);

  const [msg] = await sql`
    select m.sender_client_id, rm.role, r.realtime_key
    from messages m
    join rooms r on r.id = m.room_id
    left join room_members rm on rm.room_id = m.room_id and rm.client_id = ${client.id}
    where m.id = ${msgId}`;
  if (!msg) throw new HttpError(404, "NOT_FOUND", "message not found");

  const isSender = msg.sender_client_id === client.id;
  if (!isSender && msg.role !== "owner" && msg.role !== "admin") {
    throw new HttpError(403, "FORBIDDEN", "not allowed to delete this message");
  }

  await sql`delete from messages where id = ${msgId}`;
  await notifyRoom(msg.realtime_key, { event: "messages", payload: { op: "delete", id: msgId } });
  return ok(200, isSender ? { status: "deleted" } : { status: "deleted", by: "admin" });
});
