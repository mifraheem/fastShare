/**
 * Room handlers: create, join, list joined, delete (owner), extend (owner), get detail.
 * All expect req.clientId and req.clientUuid (use attachClient middleware).
 */

const { getDb } = require('../db/connection');
const config = require('../config');
const { ok, fail } = require('../helpers/responses');
const { nowUnix, isSqliteBusy } = require('../middleware/client');
const { generateCode } = require('../utils/code');
const { generateRoomName } = require('../utils/room');

const DEFAULT_ROOM_TTL = config.DEFAULT_ROOM_TTL_SECONDS;

function getRoomByCode(code) {
  const db = getDb();
  return db.prepare(
    'SELECT id, code, name, owner_client_id, expires_at, created_at, updated_at FROM rooms WHERE code = ?'
  ).get(code);
}

function isExpired(expiresAt) {
  return expiresAt <= nowUnix();
}

// --- Create room ---
function createRoom(req, res) {
  const clientId = req.clientId;
  const db = getDb();
  const n = nowUnix();
  const expiresAt = n + DEFAULT_ROOM_TTL;

  let name = generateRoomName();
  if (req.body && req.body.name && String(req.body.name).trim()) {
    name = String(req.body.name).trim();
  }

  const code = generateCode();

  try {
    const insertRoom = db.prepare(`
      INSERT INTO rooms (code, name, owner_client_id, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertRoom.run(code, name, clientId, expiresAt, n, n);

    const row = db.prepare('SELECT id FROM rooms WHERE code = ?').get(code);
    const roomId = row.id;

    db.prepare(
      'INSERT OR IGNORE INTO room_members (room_id, client_id, role, joined_at) VALUES (?, ?, ?, ?)'
    ).run(roomId, clientId, 'owner', n);

    return ok(res, 201, {
      code,
      name,
      owner: true,
      expires_at: expiresAt,
      expires_in: expiresAt - n,
      created_at: n,
      updated_at: n,
      owner_client_id: clientId
    });
  } catch (err) {
    console.error('CreateRoom error:', err);
    if (isSqliteBusy(err)) {
      return fail(res, 503, 'DB_BUSY', 'database is busy, retry');
    }
    return fail(res, 500, 'DB_WRITE_FAILED', 'failed to create room');
  }
}

// --- Join room ---
function joinRoom(req, res) {
  const code = (req.params.code || '').trim();
  if (!code) return fail(res, 400, 'BAD_REQUEST', 'missing room code');

  const clientId = req.clientId;
  const db = getDb();
  const room = getRoomByCode(code);

  if (!room) return fail(res, 404, 'NOT_FOUND', 'room not found');
  if (isExpired(room.expires_at)) return fail(res, 410, 'ROOM_EXPIRED', 'room expired');

  const n = nowUnix();
  try {
    db.prepare(
      'INSERT OR IGNORE INTO room_members (room_id, client_id, role, joined_at) VALUES (?, ?, ?, ?)'
    ).run(room.id, clientId, 'member', n);
    db.prepare('UPDATE rooms SET updated_at = ? WHERE id = ?').run(n, room.id);

    return ok(res, 200, {
      status: 'joined',
      code: room.code,
      name: room.name,
      expires_at: room.expires_at,
      expires_in: room.expires_at - n
    });
  } catch (err) {
    console.error('JoinRoom error:', err);
    if (isSqliteBusy(err)) return fail(res, 503, 'DB_BUSY', 'database is busy, retry');
    return fail(res, 500, 'DB_WRITE_FAILED', 'failed to join room');
  }
}

// --- Get joined rooms ---
function getJoinedRooms(req, res) {
  const clientId = req.clientId;
  const includeExpired = (req.query.include_expired === 'true' || req.query.include_expired === '1');
  const n = nowUnix();
  const db = getDb();

  let query = `
    SELECT r.code, r.name, r.owner_client_id, r.expires_at, r.created_at, r.updated_at,
           rm.role, rm.joined_at
    FROM room_members rm
    JOIN rooms r ON r.id = rm.room_id
    WHERE rm.client_id = ?
  `;
  const params = [clientId];
  if (!includeExpired) {
    query += ' AND r.expires_at > ?';
    params.push(n);
  }
  query += ' ORDER BY r.updated_at DESC';

  try {
    const rows = db.prepare(query).all(...params);
    const rooms = rows.map((row) => {
      const expiresIn = Math.max(0, row.expires_at - n);
      return {
        code: row.code,
        name: row.name,
        role: row.role,
        joined_at: row.joined_at,
        owner: row.owner_client_id === clientId,
        expires_at: row.expires_at,
        expires_in: expiresIn,
        created_at: row.created_at,
        updated_at: row.updated_at,
        expired: row.expires_at <= n
      };
    });
    return ok(res, 200, { rooms });
  } catch (err) {
    console.error('GetJoinedRooms error:', err);
    if (isSqliteBusy(err)) return fail(res, 503, 'DB_BUSY', 'database is busy, retry');
    return fail(res, 500, 'INTERNAL', 'failed to list rooms');
  }
}

// --- Owner delete room ---
function ownerDeleteRoom(req, res) {
  const code = (req.params.code || '').trim();
  if (!code) return fail(res, 400, 'BAD_REQUEST', 'missing room code');

  const clientId = req.clientId;
  const room = getRoomByCode(code);

  if (!room) return fail(res, 404, 'NOT_FOUND', 'room not found');
  if (room.owner_client_id !== clientId) {
    return fail(res, 403, 'FORBIDDEN', 'only owner can delete room');
  }

  try {
    getDb().prepare('DELETE FROM rooms WHERE id = ?').run(room.id);
    return ok(res, 200, { status: 'deleted', code });
  } catch (err) {
    console.error('OwnerDeleteRoom error:', err);
    if (isSqliteBusy(err)) return fail(res, 503, 'DB_BUSY', 'database is busy, retry');
    return fail(res, 500, 'DB_WRITE_FAILED', 'failed to delete room');
  }
}

// --- Owner extend room ---
function ownerExtendRoom(req, res) {
  const code = (req.params.code || '').trim();
  if (!code) return fail(res, 400, 'BAD_REQUEST', 'missing room code');

  const clientId = req.clientId;
  let minutes = 0;
  if (req.body && req.body.minutes != null) {
    minutes = parseInt(req.body.minutes, 10) || 0;
  }
  if (req.query.minutes) {
    minutes = parseInt(req.query.minutes, 10) || 0;
  }
  if (minutes < config.MIN_EXTEND_MINUTES || minutes > config.MAX_EXTEND_MINUTES) {
    return fail(res, 400, 'BAD_REQUEST', 'minutes must be between ' + config.MIN_EXTEND_MINUTES + ' and ' + config.MAX_EXTEND_MINUTES);
  }

  const room = getRoomByCode(code);
  if (!room) return fail(res, 404, 'NOT_FOUND', 'room not found');
  if (room.owner_client_id !== clientId) {
    return fail(res, 403, 'FORBIDDEN', 'only owner can extend room');
  }
  if (isExpired(room.expires_at)) {
    return fail(res, 410, 'ROOM_EXPIRED', 'room already expired; cannot extend');
  }

  const n = nowUnix();
  const newExpiresAt = room.expires_at + minutes * 60;

  try {
    getDb().prepare('UPDATE rooms SET expires_at = ?, updated_at = ? WHERE id = ?')
      .run(newExpiresAt, n, room.id);
    return ok(res, 200, {
      status: 'extended',
      code: room.code,
      name: room.name,
      old_expires: room.expires_at,
      expires_at: newExpiresAt,
      expires_in: newExpiresAt - n,
      added_minutes: minutes
    });
  } catch (err) {
    console.error('OwnerExtendRoom error:', err);
    if (isSqliteBusy(err)) return fail(res, 503, 'DB_BUSY', 'database is busy, retry');
    return fail(res, 500, 'DB_WRITE_FAILED', 'failed to extend room');
  }
}

// --- Get room detail (with members and names) ---
function getRoomDetail(req, res) {
  const code = (req.params.code || '').trim();
  if (!code) return fail(res, 400, 'BAD_REQUEST', 'missing room code');

  const clientId = req.clientId;
  const db = getDb();
  const room = getRoomByCode(code);

  if (!room) return fail(res, 404, 'NOT_FOUND', 'room not found');

  const memberCheck = db.prepare(
    'SELECT 1 FROM room_members WHERE room_id = ? AND client_id = ?'
  ).get(room.id, clientId);
  if (!memberCheck) return fail(res, 403, 'FORBIDDEN', 'not a room member');

  const memberRows = db.prepare(`
    SELECT rm.client_id as id, rm.role, rm.joined_at, COALESCE(c.name, '') as name
    FROM room_members rm
    LEFT JOIN clients c ON c.id = rm.client_id
    WHERE rm.room_id = ?
    ORDER BY rm.joined_at ASC
  `).all(room.id);

  const members = memberRows.map((m) => ({
    id: m.id,
    name: m.name || 'Member',
    role: m.role,
    joined_at: m.joined_at,
    me: m.id === clientId
  }));

  const n = nowUnix();
  let expiresIn = room.expires_at - n;
  if (expiresIn < 0) expiresIn = 0;

  return ok(res, 200, {
    code: room.code,
    name: room.name,
    owner: room.owner_client_id === clientId,
    expires_at: room.expires_at,
    expires_in: expiresIn,
    expired: room.expires_at <= n,
    created_at: room.created_at,
    updated_at: room.updated_at,
    members,
    member_count: members.length
  });
}

module.exports = {
  createRoom,
  joinRoom,
  getJoinedRooms,
  ownerDeleteRoom,
  ownerExtendRoom,
  getRoomDetail,
  getRoomByCode,
  isExpired
};
