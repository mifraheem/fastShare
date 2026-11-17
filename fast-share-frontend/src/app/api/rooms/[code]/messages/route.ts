import {
  handle, ok, requireClient, requireMembership, now, HttpError, MAX_MESSAGE_LENGTH,
} from "@/server/api";
import { sql } from "@/server/db";

type Params = { code: string };

/** GET /api/rooms/:code/messages?after=&limit= — oldest first, after a message id. */
export const GET = handle<Params>(async (req, { code }) => {
  const client = await requireClient(req);
  const room = await requireMembership(code.trim(), client.id);

  const params = req.nextUrl.searchParams;
  const after = Math.max(0, parseInt(params.get("after") ?? "", 10) || 0);
  let limit = parseInt(params.get("limit") ?? "", 10) || 50;
  if (limit <= 0 || limit > 100) limit = 50;

  const rows = await sql`
    select m.id, m.sender_client_id, m.content, m.created_at, c.name as sender_name
    from messages m
    left join clients c on c.id = m.sender_client_id
    where m.room_id = ${room.id} and m.id > ${after}
    order by m.id asc
    limit ${limit}`;

  const messages = rows.map((m) => ({
    id: m.id,
    sender_client_id: m.sender_client_id,
    sender_name: m.sender_name || "Member",
    content: m.content,
    created_at: m.created_at,
    mine: m.sender_client_id === client.id,
  }));
  return ok(200, { messages });
});

/** POST /api/rooms/:code/messages — body is the message as plain text (HTML from the composer). */
export const POST = handle<Params>(async (req, { code }) => {
  const client = await requireClient(req);
  const content = (await req.text()).trim();
  if (!content) throw new HttpError(400, "BAD_REQUEST", "empty message body");
  if (content.length > MAX_MESSAGE_LENGTH) throw new HttpError(413, "TOO_LARGE", "message too long");

  const room = await requireMembership(code.trim(), client.id);
  const n = now();
  const [msg] = await sql`
    insert into messages (room_id, sender_client_id, content, created_at)
    values (${room.id}, ${client.id}, ${content}, ${n})
    returning id`;

  return ok(201, { id: msg.id, content, created_at: n });
});
