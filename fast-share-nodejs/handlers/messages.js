/**
 * Message handlers: send, get list, update own, delete (own or admin).
 * Expects req.clientId (use attachClient middleware).
 */

const { getDb } = require('../db/connection');
const { ok, fail } = require('../helpers/responses');
const { nowUnix, isSqliteBusy } = require('../middleware/client');

function getRoomAndRole(code, clientId) {
  const db = getDb();
  return db.prepare(`
    SELECT r.id as roomId, rm.role, r.expires_at
    FROM rooms r
    JOIN room_members rm ON rm.room_id = r.id
    WHERE r.code = ? AND rm.client_id = ?
  `).get(code, clientId);
}

// --- Send message ---
function sendMessage(req, res) {
  const code = (req.params.code || '').trim();
  const clientId = req.clientId;

  let content = '';
  if (req.body !== undefined && req.body !== null) {
    content = (typeof req.body === 'string' ? req.body : String(req.body)).trim();
  }
  if (!content) return fail(res, 400, 'BAD_REQUEST', 'empty message body');

  const room = getRoomAndRole(code, clientId);
  if (!room) return fail(res, 403, 'FORBIDDEN', 'not a room member');
  if (room.expires_at <= nowUnix()) {
    return fail(res, 410, 'ROOM_EXPIRED', 'room expired');
  }

  const n = nowUnix();
  try {
    const result = getDb().prepare(`
      INSERT INTO messages (room_id, sender_client_id, content, created_at)
      VALUES (?, ?, ?, ?)
    `).run(room.roomId, clientId, content, n);

    return ok(res, 201, {
      id: result.lastInsertRowid,
      content,
      created_at: n
    });
  } catch (err) {
    console.error('SendMessage error:', err);
    if (isSqliteBusy(err)) return fail(res, 503, 'DB_BUSY', 'database is busy, retry');
    return fail(res, 500, 'DB_WRITE_FAILED', 'failed to send message');
  }
}

// --- Get room messages (with sender names) ---
function getRoomMessages(req, res) {
  const code = (req.params.code || '').trim();
  const clientId = req.clientId;

  const room = getRoomAndRole(code, clientId);
  if (!room) return fail(res, 403, 'FORBIDDEN', 'not a room member');
  if (room.expires_at <= nowUnix()) {
    return fail(res, 410, 'ROOM_EXPIRED', 'room expired');
  }

  const afterId = parseInt(req.query.after, 10) || 0;
  let limit = parseInt(req.query.limit, 10) || 50;
  if (limit <= 0 || limit > 100) limit = 50;

  try {
    const rows = getDb().prepare(`
      SELECT m.id, m.sender_client_id, m.content, m.created_at, COALESCE(c.name, '') as sender_name
      FROM messages m
      LEFT JOIN clients c ON c.id = m.sender_client_id
      WHERE m.room_id = ? AND m.id > ?
      ORDER BY m.id ASC
      LIMIT ?
    `).all(room.roomId, afterId, limit);

    const messages = rows.map((m) => ({
      id: m.id,
      sender_client_id: m.sender_client_id,
      sender_name: m.sender_name || 'Member',
      content: m.content,
      created_at: m.created_at,
      mine: m.sender_client_id === clientId
    }));

    return ok(res, 200, { messages });
  } catch (err) {
    console.error('GetRoomMessages error:', err);
    if (isSqliteBusy(err)) return fail(res, 503, 'DB_BUSY', 'database is busy, retry');
    return fail(res, 500, 'INTERNAL', 'failed to load messages');
  }
}

// --- Update own message ---
function updateMessage(req, res) {
  const msgId = parseInt(req.params.id, 10);
  const clientId = req.clientId;

  let content = '';
  if (req.body !== undefined && req.body !== null) {
    content = (typeof req.body === 'string' ? req.body : String(req.body)).trim();
  }
  if (!content) return fail(res, 400, 'BAD_REQUEST', 'empty message body');

  try {
    const result = getDb().prepare(`
      UPDATE messages SET content = ? WHERE id = ? AND sender_client_id = ?
    `).run(content, msgId, clientId);

    if (result.changes === 0) {
      return fail(res, 403, 'FORBIDDEN', 'not message owner or message not found');
    }
    return ok(res, 200, { id: msgId, status: 'updated' });
  } catch (err) {
    console.error('UpdateMessage error:', err);
    if (isSqliteBusy(err)) return fail(res, 503, 'DB_BUSY', 'database is busy, retry');
    return fail(res, 500, 'DB_WRITE_FAILED', 'failed to update message');
  }
}

// --- Delete message (sender or owner/admin) ---
function deleteMessage(req, res) {
  const msgId = parseInt(req.params.id, 10);
  const clientId = req.clientId;
  const db = getDb();

  const msg = db.prepare('SELECT sender_client_id, room_id FROM messages WHERE id = ?').get(msgId);
  if (!msg) return fail(res, 404, 'NOT_FOUND', 'message not found');

  if (msg.sender_client_id === clientId) {
    db.prepare('DELETE FROM messages WHERE id = ?').run(msgId);
    return ok(res, 200, { status: 'deleted' });
  }

  const member = db.prepare(
    'SELECT role FROM room_members WHERE room_id = ? AND client_id = ?'
  ).get(msg.room_id, clientId);
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return fail(res, 403, 'FORBIDDEN', 'not allowed to delete this message');
  }

  db.prepare('DELETE FROM messages WHERE id = ?').run(msgId);
  return ok(res, 200, { status: 'deleted', by: 'admin' });
}

module.exports = {
  sendMessage,
  getRoomMessages,
  updateMessage,
  deleteMessage
};
