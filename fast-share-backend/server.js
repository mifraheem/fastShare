/**
 * FastShare Backend - Node.js + Express
 * Entry point: init database, CORS (allow all), rate limit, mount routes.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { getDb } = require('./db/connection');
const { migrate } = require('./db/migrate');
const routes = require('./routes');

// Initialize database and run migrations (don't crash process if DB fails)
try {
  getDb();
  migrate();
} catch (err) {
  console.error('Database init failed:', err.message);
  console.error('Server will start but API will return errors until DB is fixed.');
}

const app = express();

// CORS: allow all origins (no allowlist)
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization', 'X-Client-UUID'],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false
}));

// Global rate limiter: apply to all API requests
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  limit: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  handler: (req, res) => {
    res.status(429).json({ ok: false, error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later.' } });
  }
});
app.use(limiter);

app.use(cookieParser());

// Body parsing: JSON and plain text (for message send/update)
app.use(express.json());
app.use(express.text({ type: 'text/*', defaultCharset: 'utf-8' }));

// Mount API routes
app.use('/', routes);

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    ok: false,
    error: { code: 'INTERNAL', message: 'Internal server error' }
  });
});

app.listen(config.PORT, () => {
  console.log('FastShare (Node.js) running on port', config.PORT);
  console.log('Rate limit:', config.RATE_LIMIT_MAX, 'req /', config.RATE_LIMIT_WINDOW_MS / 1000, 's per IP');
});
