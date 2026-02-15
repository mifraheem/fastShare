/**
 * Standard API response helpers.
 * All handlers use { ok: true, data } or { ok: false, error: { code, message } }.
 */

function ok(res, status, data) {
  return res.status(status).json({ ok: true, data });
}

function fail(res, status, code, message) {
  return res.status(status).json({
    ok: false,
    error: { code, message }
  });
}

module.exports = { ok, fail };
