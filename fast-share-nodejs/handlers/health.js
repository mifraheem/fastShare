const { ok, fail } = require('../helpers/responses');
const { getDb } = require('../db/connection');
function getHealth(req, res) {
  const db = getDb();
  if (!db) {
    return fail(res, 500, 'INTERNAL', 'Database connection failed');
  }
  return ok(res, 200, { message: 'FastShare backend is running and database is connected' });
}

module.exports = { getHealth };