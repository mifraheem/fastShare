import {
  handle, ok, requireClient, positiveInt, HttpError, MAX_MESSAGE_LENGTH,
} from "@/server/api";
import { sql } from "@/server/db";

type Params = { id: string };

/** PUT /api/messages/:id — edit own message. Body: plain text. */
export const PUT = handle<Params>(async (req, { id }) => {
  const client = await requireClient(req);
  const msgId = positiveInt(id);
  const content = (await req.text()).trim();
  if (!content) throw new HttpError(400, "BAD_REQUEST", "empty message body");
  if (content.length > MAX_MESSAGE_LENGTH) throw new HttpError(413, "TOO_LARGE", "message too long");

  const updated = await sql`
    update messages set content = ${content}
    where id = ${msgId} and sender_client_id = ${client.id}
    returning id`;
  if (updated.length === 0) {
    throw new HttpError(403, "FORBIDDEN", "not message owner or message not found");
  }
  return ok(200, { id: msgId, status: "updated" });
});

/** DELETE /api/messages/:id — sender, or the room's owner/admin. */
export const DELETE = handle<Params>(async (req, { id }) => {
  const client = await requireClient(req);
  const msgId = positiveInt(id);

  const [msg] = await sql`
    select m.sender_client_id, rm.role
    from messages m
    left join room_members rm on rm.room_id = m.room_id and rm.client_id = ${client.id}
    where m.id = ${msgId}`;
  if (!msg) throw new HttpError(404, "NOT_FOUND", "message not found");

  const isSender = msg.sender_client_id === client.id;
  if (!isSender && msg.role !== "owner" && msg.role !== "admin") {
    throw new HttpError(403, "FORBIDDEN", "not allowed to delete this message");
  }

  await sql`delete from messages where id = ${msgId}`;
  return ok(200, isSender ? { status: "deleted" } : { status: "deleted", by: "admin" });
});
