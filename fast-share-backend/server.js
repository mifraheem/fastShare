/**
 * FastShare Backend - Node.js + Express
 * Entry point: init database, apply CORS, mount routes.
 * Load .env first so config can read CORS_ORIGINS etc.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { getDb } = require('./db/connection');
const { migrate } = require('./db/migrate');
const routes = require('./routes');

// Initialize database and run migrations
getDb();
migrate();

const app = express();

// CORS: allow only origins from config (read from .env CORS_ORIGINS)
const allowedOrigins = new Set(config.CORS_ORIGINS);
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (e.g. Postman, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'X-Client-UUID'],
  credentials: true
}));

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
});
