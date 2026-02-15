/**
 * App configuration.
 * Reads from process.env (use .env file with dotenv loaded in server.js).
 */

function normalizeOrigin(origin) {
  if (!origin || typeof origin !== 'string') return '';
  return origin.trim().replace(/\/+$/, '');
}

function getCorsOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (!raw || typeof raw !== 'string') {
    return ['http://localhost:8080', 'http://localhost:5173', 'http://127.0.0.1:5173'];
  }
  return raw
    .split(',')
    .map((s) => normalizeOrigin(s))
    .filter(Boolean);
}

module.exports = {
  PORT: process.env.PORT || 8000,
  DB_PATH: process.env.DB_PATH || 'app.db',
  CORS_ORIGINS: getCorsOrigins(),
  // Room default TTL in seconds (e.g. 3000 = 50 minutes)
  DEFAULT_ROOM_TTL_SECONDS: 3000,
  // Client identity TTL in seconds (e.g. 24 hours)
  DEFAULT_CLIENT_TTL_SECONDS: 86400,
  // Extend room: min and max minutes
  MIN_EXTEND_MINUTES: 1,
  MAX_EXTEND_MINUTES: 60,
  // Display name max length
  MAX_CLIENT_NAME_LENGTH: 15
};
