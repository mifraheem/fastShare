/**
 * Database schema migration.
 * Creates tables and indexes if they do not exist.
 * Also adds the "name" column to clients if missing (for display names).
 */

const { getDb } = require('./connection');

const schema = `
  -- Clients: browser identities (UUID) with expiry
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- Rooms: code, name, owner, expiry
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    owner_client_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (owner_client_id) REFERENCES clients(id)
  );

  -- Room members: who is in which room
  CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at INTEGER NOT NULL,
    UNIQUE(room_id, client_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  -- Messages: chat messages per room
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    sender_client_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_client_id) REFERENCES clients(id)
  );

  -- Files: metadata; actual files stored on disk
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    uploader_client_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    downloaded INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_client_id) REFERENCES clients(id)
  );

  -- Indexes for fast lookups
  CREATE INDEX IF NOT EXISTS idx_clients_uuid ON clients(uuid);
  CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
  CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner_client_id);
  CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
  CREATE INDEX IF NOT EXISTS idx_room_members_client ON room_members(client_id);
  CREATE INDEX IF NOT EXISTS idx_messages_room_poll ON messages(room_id, id);
  CREATE INDEX IF NOT EXISTS idx_files_room ON files(room_id);
`;

function migrate() {
  const db = getDb();
  db.exec(schema);

  // Add clients.name for display names (ignore error if column already exists)
  try {
    db.exec("ALTER TABLE clients ADD COLUMN name TEXT DEFAULT ''");
  } catch (e) {
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
}

module.exports = { migrate };
