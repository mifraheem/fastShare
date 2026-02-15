/**
 * PUT /me - Set or update current client display name.
 * Header: X-Client-UUID
 * Body: { "name": "DisplayName" } (max 15 chars)
 */

const { getDb } = require('../db/connection');
const config = require('../config');
const { ok, fail } = require('../helpers/responses');
const { isSqliteBusy } = require('../middleware/client');

function putMe(req, res) {
  const uuid = req.clientUuid;
  const clientId = req.clientId;

  let name = (req.body && req.body.name != null) ? String(req.body.name).trim() : '';
  if (!name) {
    return fail(res, 400, 'BAD_REQUEST', 'name is required');
  }
  if (name.length > config.MAX_CLIENT_NAME_LENGTH) {
    name = name.slice(0, config.MAX_CLIENT_NAME_LENGTH);
  }

  const db = getDb();
  try {
    db.prepare('UPDATE clients SET name = ? WHERE id = ?').run(name, clientId);
    return ok(res, 200, { name });
  } catch (err) {
    console.error('PutMe update error:', err);
    if (isSqliteBusy(err)) {
      return fail(res, 503, 'DB_BUSY', 'database is busy, retry');
    }
    return fail(res, 500, 'INTERNAL', 'failed to update name');
  }
}

module.exports = { putMe };
