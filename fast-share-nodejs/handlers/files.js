/**
 * File handlers: upload, list room files, download, delete (owner/admin).
 * Uses attachClient for most; for download we also accept cookie (see routes).
 */

const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/connection');
const { ok, fail } = require('../helpers/responses');
const { getClientUuid, nowUnix } = require('../middleware/client');
const { ensureDir, resolveFileName } = require('../storage/disk');

const MEDIA_DIR = 'media';

function resolveRoom(code, clientId) {
  const row = getDb().prepare(`
    SELECT r.id as roomId, r.expires_at
    FROM rooms r
    JOIN room_members rm ON rm.room_id = r.id
    WHERE r.code = ? AND rm.client_id = ?
  `).get(code, clientId);
  return row;
}

function resolveRoomRole(roomId, clientId) {
  const row = getDb().prepare(
    'SELECT role FROM room_members WHERE room_id = ? AND client_id = ?'
  ).get(roomId, clientId);
  return row ? row.role : null;
}

/**
 * Get clientId from header or cookie (for download). Returns clientId or null.
 */
function getClientIdForRequest(req) {
  const uuid = (req.get('X-Client-UUID') || req.cookies && req.cookies['X-Client-UUID'] || '').trim();
  if (!uuid || uuid.length < 8) return null;
  const row = getDb().prepare('SELECT id FROM clients WHERE uuid = ?').get(uuid);
  return row ? row.id : null;
}

// --- Upload file ---
function uploadFile(req, res) {
  const code = (req.params.code || '').trim();
  if (!code) return fail(res, 400, 'BAD_REQUEST', 'missing room code');

  const clientId = req.clientId;
  const room = resolveRoom(code, clientId);
  if (!room) return fail(res, 403, 'FORBIDDEN', 'not a room member');
  if (room.expires_at <= nowUnix()) {
    return fail(res, 410, 'ROOM_EXPIRED', 'room expired');
  }

  if (!req.file) return fail(res, 400, 'BAD_REQUEST', 'file is required');

  const originalName = path.basename(req.file.originalname || req.file.filename || 'file');
  if (!originalName || originalName === '.' || originalName === '/') {
    return fail(res, 400, 'BAD_REQUEST', 'invalid filename');
  }

  const roomDir = path.join(MEDIA_DIR, code);
  ensureDir(roomDir);
  const finalName = resolveFileName(roomDir, originalName);
  const finalPath = path.join(roomDir, finalName);

  const buffer = req.file.buffer;
  const size = buffer.length;
  try {
    fs.writeFileSync(finalPath, buffer);
  } catch (err) {
    console.error('UploadFile write error:', err);
    return fail(res, 500, 'STORAGE_ERROR', 'failed to save file');
  }
  const n = nowUnix();

  try {
    const result = getDb().prepare(`
      INSERT INTO files (room_id, uploader_client_id, filename, path, size, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(room.roomId, clientId, finalName, finalPath, size, n);

    return ok(res, 201, {
      id: result.lastInsertRowid,
      filename: finalName,
      size,
      path: finalPath,
      uploaded_at: n
    });
  } catch (err) {
    fs.unlinkSync(finalPath);
    console.error('UploadFile db error:', err);
    return fail(res, 500, 'DB_WRITE_FAILED', 'failed to save file metadata');
  }
}

// --- Get room files ---
function getRoomFiles(req, res) {
  const code = (req.params.code || '').trim();
  if (!code) return fail(res, 400, 'BAD_REQUEST', 'missing room code');

  const clientId = req.clientId;
  const room = resolveRoom(code, clientId);
  if (!room) return fail(res, 403, 'FORBIDDEN', 'not a room member');
  if (room.expires_at <= nowUnix()) {
    return fail(res, 410, 'ROOM_EXPIRED', 'room expired');
  }

  const rows = getDb().prepare(`
    SELECT id, filename, size, downloaded, created_at
    FROM files WHERE room_id = ? ORDER BY id DESC
  `).all(room.roomId);

  const files = rows.map((f) => ({
    id: f.id,
    filename: f.filename,
    size: f.size,
    downloaded: f.downloaded,
    created_at: f.created_at
  }));

  return ok(res, 200, { files });
}

// --- Download file ---
function downloadFile(req, res) {
  const fileId = parseInt(req.params.id, 10);
  if (!fileId || fileId <= 0) return fail(res, 400, 'BAD_REQUEST', 'invalid id');

  const clientId = getClientIdForRequest(req);
  if (!clientId) return fail(res, 400, 'BAD_REQUEST', 'missing client identity');

  const row = getDb().prepare(`
    SELECT f.filename, f.path, r.expires_at
    FROM files f
    JOIN rooms r ON r.id = f.room_id
    JOIN room_members rm ON rm.room_id = r.id
    WHERE f.id = ? AND rm.client_id = ?
  `).get(fileId, clientId);

  if (!row) return fail(res, 404, 'NOT_FOUND', 'file not found or no access');
  if (row.expires_at <= nowUnix()) {
    return fail(res, 410, 'ROOM_EXPIRED', 'room expired');
  }

  if (!fs.existsSync(row.path)) {
    return fail(res, 404, 'NOT_FOUND', 'file missing on disk');
  }

  getDb().prepare('UPDATE files SET downloaded = downloaded + 1 WHERE id = ?').run(fileId);

  res.setHeader('Content-Disposition', 'attachment; filename="' + row.filename + '"');
  return res.sendFile(path.resolve(row.path));
}

// --- Delete file (owner/admin only) ---
function deleteFile(req, res) {
  const fileId = parseInt(req.params.id, 10);
  if (!fileId || fileId <= 0) return fail(res, 400, 'BAD_REQUEST', 'invalid id');

  const clientId = req.clientId;

  const fileRow = getDb().prepare(`
    SELECT f.room_id, f.path, r.expires_at
    FROM files f
    JOIN rooms r ON r.id = f.room_id
    WHERE f.id = ?
  `).get(fileId);

  if (!fileRow) return fail(res, 404, 'NOT_FOUND', 'file not found');

  const role = resolveRoomRole(fileRow.room_id, clientId);
  if (!role) return fail(res, 403, 'FORBIDDEN', 'not a room member');
  if (role !== 'owner' && role !== 'admin') {
    return fail(res, 403, 'FORBIDDEN', 'only owner or admin can delete file');
  }

  getDb().prepare('DELETE FROM files WHERE id = ?').run(fileId);
  if (fs.existsSync(fileRow.path)) {
    try {
      fs.unlinkSync(fileRow.path);
    } catch (e) {
      console.error('DeleteFile unlink error:', e);
    }
  }

  return ok(res, 200, { status: 'deleted', id: fileId });
}

module.exports = {
  uploadFile,
  getRoomFiles,
  downloadFile,
  deleteFile,
  getClientIdForRequest
};
