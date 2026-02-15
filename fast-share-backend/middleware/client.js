/**
 * Client identity middleware and helpers.
 * Reads X-Client-UUID header and resolves or creates the client in the database.
 */

const { getDb } = require('../db/connection');
const config = require('../config');
const { fail } = require('../helpers/responses');

const HEADER_CLIENT_UUID = 'X-Client-UUID';

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function isSqliteBusy(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return msg.includes('database is locked') || msg.includes('busy') || msg.includes('locked');
}

/**
 * Get UUID from request (header). Returns null if missing or invalid.
 */
function getClientUuid(req) {
  const uuid = (req.get(HEADER_CLIENT_UUID) || '').trim();
  if (!uuid || uuid.length < 8) return null;
  return uuid;
}

/**
 * Get or create client by UUID. Returns { clientId } or throws.
 */
function getOrCreateClient(uuid) {
  const db = getDb();
  const n = nowUnix();
  const expires = n + config.DEFAULT_CLIENT_TTL_SECONDS;

  const row = db.prepare('SELECT id FROM clients WHERE uuid = ?').get(uuid);
  if (row) {
    db.prepare('UPDATE clients SET expires_at = ? WHERE id = ?').run(expires, row.id);
    return { clientId: row.id };
  }

  const result = db.prepare(
    'INSERT INTO clients (uuid, expires_at, created_at) VALUES (?, ?, ?)'
  ).run(uuid, expires, n);
  return { clientId: result.lastInsertRowid };
}

/**
 * Require client UUID from request. Returns { uuid } or sends 400 and returns null.
 */
function requireClientUuid(req, res) {
  const uuid = getClientUuid(req);
  if (!uuid) {
    fail(res, 400, 'BAD_REQUEST', 'missing or invalid X-Client-UUID header');
    return null;
  }
  return uuid;
}

/**
 * Require client to exist (by UUID). Returns clientId or sends error and returns null.
 * Use this when you only need the client to already exist (e.g. messages, files).
 */
function requireClientId(req, res) {
  const uuid = getClientUuid(req);
  if (!uuid) {
    fail(res, 400, 'BAD_REQUEST', 'missing X-Client-UUID');
    return null;
  }
  const row = getDb().prepare('SELECT id FROM clients WHERE uuid = ?').get(uuid);
  if (!row) {
    fail(res, 401, 'UNAUTHORIZED', 'invalid client identity');
    return null;
  }
  return row.id;
}

/**
 * Middleware: ensure req.clientId is set (get or create client).
 * Call after requireClientUuid if you need to create client on first visit.
 */
function attachClient(req, res, next) {
  const uuid = getClientUuid(req);
  if (!uuid) {
    return fail(res, 400, 'BAD_REQUEST', 'missing or invalid X-Client-UUID header');
  }
  try {
    const { clientId } = getOrCreateClient(uuid);
    req.clientId = clientId;
    req.clientUuid = uuid;
    next();
  } catch (err) {
    console.error('attachClient error:', err);
    if (isSqliteBusy(err)) {
      return fail(res, 503, 'DB_BUSY', 'database is busy, retry');
    }
    return fail(res, 500, 'INTERNAL', 'failed to resolve client');
  }
}

module.exports = {
  nowUnix,
  isSqliteBusy,
  getClientUuid,
  getOrCreateClient,
  requireClientUuid,
  requireClientId,
  attachClient,
  HEADER_CLIENT_UUID
};
