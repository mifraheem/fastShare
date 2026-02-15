/**
 * SQLite database connection.
 * Uses better-sqlite3 for synchronous, simple API.
 */

const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');

let db = null;

function getDb() {
  if (!db) {
    const dbPath = path.isAbsolute(config.DB_PATH)
      ? config.DB_PATH
      : path.join(process.cwd(), config.DB_PATH);
    db = new Database(dbPath);

    // SQLite performance and safety
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('temp_store = MEMORY');
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDb,
  closeDb
};
